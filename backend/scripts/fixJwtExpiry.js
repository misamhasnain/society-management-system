import fs from "node:fs";

const file = ".env";
const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);
let found = false;
const out = lines.map((line) => {
  if (line.startsWith("JWT_EXPIRES_IN=")) {
    found = true;
    return "JWT_EXPIRES_IN=1d";
  }
  return line;
});
if (!found) out.push("JWT_EXPIRES_IN=1d");

fs.writeFileSync(file, out.join("\n"));
console.log("JWT_EXPIRES_IN fixed to 1d");