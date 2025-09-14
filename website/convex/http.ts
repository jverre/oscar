import { httpRouter } from "convex/server";
import { uploadMessages } from "./uploadMessages";
import { createConversation } from "./conversations";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

// POST /uploadMessages - Upload chat messages to database
http.route({
  path: "/uploadMessages",
  method: "POST",
  handler: uploadMessages,
});

// POST /createConversation - Create a new conversation
http.route({
  path: "/createConversation",
  method: "POST",
  handler: createConversation,
});

export default http;