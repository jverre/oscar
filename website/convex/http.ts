import { httpRouter } from "convex/server";
import { uploadMessages } from "./uploadMessages";

const http = httpRouter();

// POST /uploadMessages - Upload chat messages to database
http.route({
  path: "/uploadMessages",
  method: "POST",
  handler: uploadMessages,
});

export default http;