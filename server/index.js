// import express from "express";
import { ApolloServer, gql } from "apollo-server";
import schema from "./schema";
import resolvers from "./resolvers";
import db from "./models";
import cors from "cors";
const server = new ApolloServer({
  typeDefs: schema,
  resolvers,
  context: { db },
  introspection: true,
  playground: true,
},
);

// const app = express();
// server.use(cors());
// server.applyMiddleware({ app });

server.listen({ port: process.env.PORT || 4000 }, () =>
  console.log(`🚀 Server ready at http://localhost:${process.env.PORT || 4000}`)
);
