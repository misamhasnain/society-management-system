import fs from "node:fs";
import crypto from "node:crypto";

const file = ".env";
const secret = crypto.randomBytes(64).toString("hex");

const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
let found = false;
const out = lines.map((line) => {
  if (line.startsWith("JWT_SECRET=")) {
    found = true;
    return "JWT_SECRET=" + secret;
  }
  return line;
});
if (!found) out.push("JWT_SECRET=" + secret);

fs.writeFileSync(file, out.join("\n"));
console.log("JWT_SECRET updated, length:", secret.length);s