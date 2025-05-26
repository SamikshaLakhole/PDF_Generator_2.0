export const getIdToken = () => {
  // Initialize a variable to hold the token
  let token = null;

  // Loop through all keys in sessionStorage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    const value = sessionStorage.getItem(key);

    if (key.toLowerCase().includes("idtoken")) {
      console.log(`Found token key: ${key}`);

      // Parse the JSON value
      try {
        const jsonValue = JSON.parse(value);

        // Access the secret property (adjust the property name as necessary)
        if (jsonValue.secret) {
          token = jsonValue.secret; // Store the token
        } else {
          console.log("No secret found in the JSON object.");
        }
      } catch (error) {
        console.error("Error parsing JSON:", error);
      }
    }
  }

  return token; // Return the token (or null if not found)
};

export const getAuthHeaders = () => {
  const token = getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// export const getIdToken = () => {
//   for (let i = 0; i < sessionStorage.length; i++) {
//     const key = sessionStorage.key(i);
//     if (key.toLowerCase().includes("idtoken")) {
//       try {
//         const { secret } = JSON.parse(sessionStorage.getItem(key));
//         if (secret) return secret;
//       } catch (e) {
//         console.error("Invalid JSON in sessionStorage for key:", key);
//       }
//     }
//   }
//   return null;
// };

// export const getAuthHeaders = () => {
//   const token = getIdToken();
//   return token ? { Authorization: `Bearer ${token}` } : {};
// };
