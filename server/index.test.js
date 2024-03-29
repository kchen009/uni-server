/* eslint-disable no-console */
import gql from 'graphql-tag';

import ApolloClient from 'apollo-client';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import fetch from 'node-fetch';

// redefine as needed
const SERVER_URI = 'http://localhost:3000/';
const badTokenError = 'GraphQL error: Bad Token';
const notAuthorizedUser = 'GraphQL error: Operation Not Permitted';

const ADMIN_EMAIL = 'john@demo.com';
const ADMIN_PASSWORD = 'password';

const STUDENT_EMAIL = 'sally@demo.com';
const STUDENT_PASSWORD = 'password';

const FACULTY_EMAIL = 'scott@demo.com';
const FACULTY_PASSWORD = 'password';

const makeClient = ({ uri = SERVER_URI, token = null } = {}) => {
  const linkOptions = {
    uri,
    fetch,
    headers: {
      authorization: token,
    },
  };

  return new ApolloClient({
    link: createHttpLink(linkOptions),
    cache: new InMemoryCache(),
  });
};

const loginUser = async ({
  client = makeClient(),
  email = ADMIN_EMAIL,
  password = ADMIN_PASSWORD,
} = {}) => {
  const loginUserMutation = gql`
    mutation LoginUser($email: String!, $password: String!) {
      loginUser(email: $email, password: $password) {
        token
        user {
          id
        }
      }
    }
  `;
  const result = await client.mutate({
    mutation: loginUserMutation,
    variables: { email, password },
  });

  const { token } = result.data.loginUser;
  return makeClient({ token });
};

const logoutUser = async (client) => {
  const logoutUserMutation = gql`
    mutation {
      logoutUser
    }
  `;

  const result = await client.mutate({ mutation: logoutUserMutation });
  return result.data.logoutUser;
};

const loginAdmin = async client => loginUser();
const loginStudent = async client => loginUser({ email: STUDENT_EMAIL, password: STUDENT_PASSWORD });
const loginFaculty = async client => loginUser({ email: FACULTY_EMAIL, password: FACULTY_PASSWORD });

const sayHello = async (client) => {
  const q = gql`
    query {
      hello
    }
  `;
  const result = await client.query({ query: q });
  return result.data;
};

const listUsers = async (client) => {
  const q = gql`
    query {
      users {
        id
        name
        email
        role
      }
    }
  `;
  const result = await client.query({ query: q });
  return result.data;
};

const listStudents = async (client) => {
  const q = gql`
    query {
      students {
        id
        name
        email
        role
        courses {
          id
          name
        }
      }
    }
  `;
  const result = await client.query({ query: q });
  return result.data;
};

//List Facutly query
const listFaculty = async (client) => {
  const q = gql`
    query {
      faculty {
        id
        name
        email
        role
        courses {
          id
          name
        }
      }
    }
  `;
  const result = await client.query({ query: q });
  return result.data;
};

const getCurrentUser = async (client) => {
  const q = gql`
    query {
      currentUser {
        id
        name
        email
        role
      }
    }
  `;
  const result = await client.query({ query: q });
  return result.data;
};

const createUser = async (client, {
  name = '', email = '', role = 'Student', password = '',
}) => {
  const m = gql`
    mutation createUser($name: String!, $email: String!, $role: Role, $password: String!) {
      createUser(user: { name: $name, email: $email, role: $role, password: $password }) {
        id
        name
        role
      }
    }
  `;
  const result = await client.mutate({
    mutation: m,
    variables: {
      name,
      email,
      role,
      password,
    },
  });

  return result.data.createUser;
};

//create course mutation
const createCourse = async (client, {
  name = '', facultyID = null,
}) => {
  const m = gql`
    mutation createCourse($name: String!, $facultyID: ID!) {
      createCourse(name: $name, facultyID: $facultyID) {
        id
        name
      }
    }
  `;
  const result = await client.mutate({
    mutation: m,
    variables: {
      name,
      facultyID,
    },
  });
  return result.data.createCourse;
};

//delete course mutation
const deleteCourse = async (client, {
  courseID = null,
}) => {
  const m = gql`
    mutation deleteCourse($courseID: ID!) {
      deleteCourse(courseID: $courseID)
    }
  `;
  const result = await client.mutate({
    mutation: m,
    variables: {
      courseID,
    },
  });
  return result.data.deleteCourse;
};

//create assignment mutation
const createAssignment = async (client, {
  name = '', courseID = null,
}) => {
  const m = gql`
    mutation createAssignment($name: String!, $courseID: ID!) {
      createAssignment(name: $name, courseID: $courseID) {
        id
        name
      }
    }
  `;
  const result = await client.mutate({
    mutation: m,
    variables: {
      name,
      courseID,
    },
  });

  return result.data.createAssignment;
};

//create assignmentGrade mutation
const createAssignmentGrade = async (client, {
  grade = null, assignmentID = null, studentID = null
}) => {
  const m = gql`
    mutation createAssignmentGrade($grade: Float!, $assignmentID: ID!, $studentID: ID!) {
      createAssignmentGrade(grade: $grade, assignmentID: $assignmentID, studentID: $studentID ) {
        id
        grade
      }
    }
  `;
  const result = await client.mutate({
    mutation: m,
    variables: {
      grade,
      assignmentID,
      studentID
    },
  });

  return result.data.createAssignmentGrade;
};
// Leaveing this test out since it wasn't part of our web app. 
// can the server say hello?
// describe('Hello Tests', () => {
//   let client;

//   beforeAll(() => {
//     client = makeClient();
//   });

//   it('should say hello', async () => {
//     const r = await sayHello(client);
//     expect(r).toEqual({ hello: 'world' });
//   });
// });

describe('Login Tests', () => {
  let client;

  beforeAll(() => {
    client = makeClient();
  });

  it('should login user', async () => {
    const newClient = await loginUser({ client });
    expect(newClient).toBeDefined();
  });

  it('should not login a user with invalid credentials', async () => {
    try {
      const newClient = await loginUser({ client, email: 'bad@example.com', password: 'bad' });
      expect(newClient).not.toBeDefined();
    } catch (e) {
      expect(e.message).toEqual('GraphQL error: Bad Login or Password');
    }
  });

  it('should not list users without login', async () => {
    expect.assertions(1);
    try {
      const result = await listUsers(client);
    } catch (e) {
      expect(e.message).toEqual(badTokenError);
    }
  });

  it('should not retrieve current user without login', async () => {
    expect.assertions(1);
    try {
      await getCurrentUser(client);
    } catch (e) {
      expect(e.message).toEqual(badTokenError);
    }
  });
});

describe('Logout Tests', () => {
  let client;

  beforeAll(async () => {
    client = await loginUser();
  });

  it('should logout a logged in user', async () => {
    const result = await logoutUser(client);
    expect(result).toEqual(true);
  });
});

describe('Invalid Logout Tests', () => {
  let client;

  beforeAll(async () => {
    client = await makeClient();
  });

  it('should not log out a user without an existing session', async () => {
    expect.assertions(1);
    try {
      const result = await logoutUser(client);
      expect(result).toEqual();
    } catch (e) {
      expect(e.message).toEqual(badTokenError);
    }
  });
});

describe('Retrieve current user', () => {
  let client;

  beforeAll(async () => {
    client = await loginUser();
  });

  it('should get the current user', async () => {
    const result = await getCurrentUser(client);
    const { currentUser } = result;

    expect(currentUser.email).toEqual(ADMIN_EMAIL);
  });
});

describe('List Users', () => {
  let client;

  beforeAll(async () => {
    client = await loginUser();
  });

  it('should list users', async () => {
    const result = await listUsers(client);
    expect(result.users.length).toBeGreaterThan(0);
    const { users } = result;
    const u = users[0];
    for (const attr of ['id', 'email', 'role', 'name']) {
      expect(u[attr]).toBeDefined();
    }
  });

  it('should list students', async () => {
    const result = await listStudents(client);
    expect(result.students.length).toBeGreaterThan(0);
    const { students } = result;
    const s = students[0];

    for (const attr of ['id', 'email', 'role', 'name']) {
      expect(s[attr]).toBeDefined();
    }
  });

  //create faculty list test
  it('should list faculty', async () => {
    const result = await listFaculty(client);
    expect(result.faculty.length).toBeGreaterThan(0);
    const { faculty } = result;
    const s = faculty[0];

    for (const attr of ['id', 'email', 'role', 'name']) {
      expect(s[attr]).toBeDefined();
    }
  });

  //would require additional queries to test, prof said we can leave out.
  it.todo('should get a single user (see my comment)');

  it.todo('should get a student (see my comment)');
});

describe('User Creation', () => {
  let client;
  beforeAll(async () => {
    client = await loginAdmin();
  });

  it('should create a user', async () => {
    // generate unique email each time the test gets
    const uniqueEmail = 'user' + Math.floor(Math.random() * 10000) + '@demo.com';
    const result = await createUser(client, {
      name: 'new user name',
      email: uniqueEmail,
      password: 'new-user-password',
    });
    expect(result.id).toBeDefined();
  });

  //create validate user email test
  it('should validate user email format', async () => {
    const uniqueNum = Math.floor(Math.random() * 10000);
    const badEmail = 'new-user' + uniqueNum;
    try {
      const result = await createUser(client, {
        name: 'new user name',
        email: badEmail,
        password: 'new-user-password',
      });
      expect(result).not.toBeDefined();
    } catch (e) {
      expect(e.message).toEqual('GraphQL error: Invalid Email Format');
    }
  });
});

describe('Course Operations', () => {
  let client;
  beforeAll(async () => {
    client = await loginFaculty();
  });

  //create a course test
  it('should create a course', async () => {
    const result = await createCourse(client, {
      name: 'new course',
      facultyID: 5
    });
    expect(result.id).toBeDefined();
  })
});


describe('Assignment Operations', () => {
  let client;
  beforeAll(async () => {
    client = await loginFaculty();
  });

  // it.todo('should create an assignment by faculty');
  it('should create an assignment by faculty', async () => {
    const result = await createAssignment(client, {
      name: 'new assignment',
      courseID: 5
    });
    expect(result.id).toBeDefined();
  })


  it('should assign a student a grade for an assignment', async () => {
    const result = await createAssignmentGrade(client, {
      grade: 91.6,
      assignmentID: 1,
      studentID: 2
    });
    expect(result.id).toBeDefined();
  })


});

describe('Enforce student authorizations', () => {
  let client;
  beforeAll(async () => {
    client = await loginStudent();
  });

  it('should not let student create a user', async () => {
    expect.assertions(1);
    try {
      await createUser(client, {
        name: 'new user name',
        email: 'newUser@example.com',
        password: 'new_password',
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });

  // should not let user create a course
  it('should not let student create a course', async () => {
    expect.assertions(1);
    try {
      await createCourse(client, {
        name: 'new course',
        facultyID: 5
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });

  // This wasn't part of the operations in original schema (updateCourse), 
  // per our discussion I am omitting.
  it.todo('should not let student update a course (see my comment)');

  // it.todo('should not let students delete a course');
  it('should not let students delete a course', async () => {
    expect.assertions(1);
    try {
      await deleteCourse(client, {
        courseID: 1,
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });

  // it.todo('should not let students create an assignment');
  it('should not let students create an assignment', async () => {
    expect.assertions(1);
    try {
      await createAssignment(client, {
        name: 'new assignment',
        courseID: 5
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });


  // it.todo('should not let students assign a grade');
  it('should not let students assign a grade', async () => {
    expect.assertions(1);
    try {
      await createAssignmentGrade(client, {
        grade: 91.6,
        assignmentID: 1,
        studentID: 2
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });

});

describe('Enforce faculty authorization', () => {
  let client;
  beforeAll(async () => {
    client = await loginFaculty();
  });

  it('should not let a faculty create a user', async () => {
    expect.assertions(1);
    try {
      await createUser(client, {
        name: 'new user name',
        email: 'newUser@example.com',
        password: 'new_password',
      });
    } catch (e) {
      expect(e.message).toEqual(notAuthorizedUser);
    }
  });
  //These operations are only allowed by faculty (see resolver for createCourse and deleteCourse)
  //and are tested by the student tests above. 
  it.todo('should not let faculty create a course (see my comment)');
  it.todo('should not let faculty delete a course (see my comment)');
});