import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import {
    ApolloServer,
    gql,
    AuthenticationError,
    ForbiddenError,
    UserInputError,
} from 'apollo-server';
import _ from 'lodash';

const APP_SECRET =
    "App Secret Key; For example only! Don't define one in code!!!";
class Users {
    constructor() {
    }

    /**
     * See https://ciphertrick.com/2016/01/18/salt-hash-passwords-using-nodejs-crypto/
     * generates random string of characters i.e salt
     * @function
     * @param {number} length - Length of the random string.
     */
    genRandomString = length => {
        return crypto
            .randomBytes(Math.ceil(length / 2))
            .toString('hex') /** convert to hexadecimal format */
            .slice(0, length); /** return required number of characters */
    };

    sha512 = (password, salt) => {
        var hash = crypto.createHmac(
            'sha512',
            salt,
        ); /** Hashing algorithm sha512 */
        hash.update(password);
        var value = hash.digest('hex');
        return {
            salt: salt,
            passwordHash: value,
        };
    };

    genSaltHashPassword = userpassword => {
        var salt = this.genRandomString(16); /** Gives us salt of length 16 */
        var passwordData = this.sha512(userpassword, salt);
        console.log('UserPassword = ' + userpassword);
        console.log('Passwordhash = ' + passwordData.passwordHash);
        console.log('nSalt = ' + passwordData.salt);
        return passwordData;
    };


    login = async (emailAddress, password, { db }) => {
        // does a user with the specified emailAddress exist?
        // let user;
        let response = await db.User.findOne({ where: { email: emailAddress } });

        // if user not found
        if (!response) {
            throw new AuthenticationError('Bad Login or Password');
        }

        // return response;
        const user = response.dataValues

        // hash the password with the user salt
        const hashedPassword = this.sha512(password, user.salt).passwordHash;

        // compare the hashed password against the one in the user record
        if (hashedPassword !== user.passwordHash) {
            console.log('hashp:', hashedPassword);
            console.log('user: ', user);
            throw new AuthenticationError('Bad Login or Password');
        }

        // create a jwt token and store
        return {
            // using loadash pick to select what we want from the user
            user: _.pick(user, ['id', 'name', 'email', 'role']),
            token: userSessions.createSession(user.id, APP_SECRET),
        };

    }


    create = async (user, db) => {
        // validate email format - https://www.w3resource.com/javascript/form/email-validation.php
        const mailformat = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
        if (!user.email.match(mailformat)) {
            throw new UserInputError('Invalid Email Format');
        }  

        // looks for user inside existing db
        let response = await db.User.findOne({ where: { email: user.email } });
        // throw if email already exists
        if (response) {
            throw new UserInputError('Email already Exists');
        }
        let password = this.genSaltHashPassword(user.password);
        // return response;
        return db.User.create({ name: user.name, email: user.email, role: user.role, ...password })
    }

    update = async (id, user, db) => {

        let password = this.genSaltHashPassword(user.password);
        try {

            let res = await db.User.update(
                {
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    ...password
                },
                {
                    returning: true,
                    where: { id: id }
                }
            );
            return res[1][0].dataValues;
        } catch (error) {
            console.log('Error ', error)
            throw new UserInputError('Unable to find User in DB');
        }
    }

    // getUsers() {
    //     return this.users;
    // }

    // getStudents() {
    //     return this.users.filter(u => u.role === 'Student');
    // }

    // getStudentByEmail(email) {
    //     return this.getStudents().filter(s => s.email === email)[0] || null;
    // }

    list() {
        return this.users;
    }

    get = async (id, context) => {
        try {
            let user = await context.db.User.findOne({ where: { id: id } })
            return user.dataValues;
        } catch (error) {
            console.log(err);
            throw new AuthenticationError('Unable to find User in DB');
        }
    }




}

class UserSessions {
    userSessions = [];
    nextID = 0;

    getSession(sessionID) {
        const i = _.findIndex(this.userSessions, u => u.id === sessionID);
        return i === -1 ? null : this.userSessions[i];
    }

    createSession(userID, secret, expiresIn = 60 * 10) {
        const session = { id: this.nextID, userID: userID };
        this.nextID++;

        const token = jwt.sign({ id: userID, sessionID: session.id }, secret, {
            expiresIn,
        });

        this.userSessions.push(session);
        console.log('token', token);
        return token;
    }
    // invalidate all sessions from that user
    invalidateSession(sessionID) {
        this.userSessions = this.userSessions.filter((session) => {
            return session.id !== sessionID;
        })
    }
}


const getUserForToken = async (token, context) => {
    try {
        console.log(id, sessionID)
        const { id, sessionID } = jwt.verify(token, APP_SECRET);
        console.log(id, sessionID)
        const user = await users.get(id, context);


        // get the user session
        // note: a better way to do this with a database is to
        // join the Users table with the UserSessions table on
        // users.id = user_sessions.user_id where session_id = sessionID
        // this would get both the user and the sessionID in one query
        const session = userSessions.getSession(sessionID);
        if (!session) {
            // If the session doesn't exist, it's been invalidated
            throw new AuthenticationError('Invalid Session');
        }

        return [user, session.id];
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            // invalidate the sesssion if expired
            const { sessionID } = jwt.decode(token);
            userSessions.invalidateSession(sessionID);
            throw new AuthenticationError('Session Expired');
        }
        throw new AuthenticationError('Bad Token');
    }
};


const makeResolver = (resolver, options) => {
    // return an adorned resolver function
    return async (root, args, context, info) => {
        const o = {
            requireUser: true,
            roles: ['Admin', 'Student', 'Faculty'],
            ...options,
        };
        const { requireUser } = o;
        const { roles } = o;
        let user = {};
        let sessionID = null;
        // console.log('session id conte4xt:', context)

        if (requireUser) {
            // get the token from the request
            const token = context.request.req.headers.authorization || '';
            if (!token) {
                throw new AuthenticationError('Token Required');
            }

            // retrieve the user given the token
            [user, sessionID] = await getUserForToken(token, context);
            if (!user) {
                throw new AuthenticationError('Invalid Token or User');
            }

            // authorize the operation for the user
            const userRole = user.role;
            if (_.indexOf(roles, userRole) === -1) {
                throw new ForbiddenError('Operation Not Permitted');
            }
        }

        // call the passed resolver with context extended with user
        return resolver(
            root,
            args,
            { ...context, user: user, sessionID: sessionID },
            info,
        );
    };
};



const userSessions = new UserSessions();
const users = new Users;


export {
    userSessions,
    users,
    makeResolver
}