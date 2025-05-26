require("dotenv").config();
const jwt = require("jsonwebtoken");
const jwksClient = require("jwks-rsa");
const db = require("../db");

const tenantId = process.env.TENANT_ID;
const clientId = process.env.CLIENT_ID;
const microsoftURLWIthTenantId = `https://login.microsoftonline.com/${tenantId}`;

const client = jwksClient({
  jwksUri: `${microsoftURLWIthTenantId}/discovery/v2.0/keys`,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      console.error("Error fetching signing key:", err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

const verifyToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];

  if (!token) {
    return res.status(403).send("A token is required for authentication");
  }

  jwt.verify(
    token,
    getKey,
    {
      algorithms: ["RS256"],
      audience: clientId,
      issuer: `${microsoftURLWIthTenantId}/v2.0`,
    },
    async (err, decoded) => {
      if (err) {
        console.error("Token verification failed:", err.message);
        return res.status(401).send("Invalid token");
      } else {
        // console.log("Token successfully verified.");
        const email = decoded.preferred_username || decoded.email;
        global.userEmail = email;

        if (!email) {
          return res.status(400).send("Email not found in token.");
        }

        // Insert into Users table if not exists
        try {
          await db("Users")
            .insert({
              email,
              active: 0, // default
              admin: 1, // default
            })
            .onConflict("email")
            .merge({ active: 1 });

        } catch (dbErr) {
          console.error("Error inserting into Users table:", dbErr);
        }

        req.user = decoded;
        next();
      }
    }
  );
};
module.exports = verifyToken;
