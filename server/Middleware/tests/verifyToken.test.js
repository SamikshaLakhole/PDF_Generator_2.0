// const jwt = require("jsonwebtoken");
// const verifyToken = require("../verifyToken");

// jest.mock("jsonwebtoken");

// describe("verifyToken middleware", () => {
//   let req, res, next;

//   beforeEach(() => {
//     req = {
//       headers: {
//         authorization: "Bearer test.token.value",
//       },
//     };
//     res = {
//       status: jest.fn().mockReturnThis(),
//       send: jest.fn(),
//     };
//     next = jest.fn();
//   });

//   afterEach(() => {
//     jest.clearAllMocks();
//   });

//   it("should return 403 if token is not provided", () => {
//     req.headers.authorization = undefined;

//     verifyToken(req, res, next);

//     expect(res.status).toHaveBeenCalledWith(403);
//     expect(res.send).toHaveBeenCalledWith(
//       "A token is required for authentication"
//     );
//     expect(next).not.toHaveBeenCalled();
//   });

//   it("should call next if token is valid", (done) => {
//     const mockDecoded = { name: "John Doe", email: "john@example.com" };
//     jwt.verify.mockImplementation((token, getKey, options, callback) => {
//       callback(null, mockDecoded);
//     });

//     verifyToken(req, res, () => {
//       expect(req.user).toEqual(mockDecoded);
//       done();
//     });
//   });

//   it("should return 403 if token is invalid", (done) => {
//     jwt.verify.mockImplementation((token, getKey, options, callback) => {
//       callback(new Error("Invalid token"), null);
//     });

//     verifyToken(req, res, next);

//     setImmediate(() => {
//       expect(next).not.toHaveBeenCalled();
//       done();
//     });
//   });

//   it("should verify correct token is passed", (done) => {
//     const token = req.headers.authorization.split(" ")[1];
//     jwt.verify.mockImplementation((tkn, getKey, options, callback) => {
//       expect(tkn).toBe(token);
//       callback(null, { sub: "user123" });
//     });

//     verifyToken(req, res, () => {
//       expect(req.user).toEqual({ sub: "user123" });
//       done();
//     });
//   });
// });



const jwt = require("jsonwebtoken");
const verifyToken = require("../verifyToken");
const db = require("../../db");

jest.mock("jsonwebtoken");
jest.mock("../../db");

describe("verifyToken middleware", () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {
        authorization: "Bearer test.token.value",
      },
    };
    res = {
      status: jest.fn().mockReturnThis(),
      send: jest.fn(),
    };
    next = jest.fn();

    // Mock environment variables
    process.env.TENANT_ID = "fake-tenant-id";
    process.env.CLIENT_ID = "fake-client-id";
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return 403 if token is not provided", () => {
    req.headers.authorization = undefined;

    verifyToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith(
      "A token is required for authentication"
    );
    expect(next).not.toHaveBeenCalled();
  });

  it("should return 401 if token verification fails", (done) => {
    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      callback(new Error("Invalid token"), null);
    });

    verifyToken(req, res, next);

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.send).toHaveBeenCalledWith("Invalid token");
      expect(next).not.toHaveBeenCalled();
      done();
    });
  });

  it("should return 400 if email not found in token", (done) => {
    const decoded = { name: "No Email" };
    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      callback(null, decoded);
    });

    verifyToken(req, res, next);

    setImmediate(() => {
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith("Email not found in token.");
      expect(next).not.toHaveBeenCalled();
      done();
    });
  });

  it("should call next and insert user if email exists", (done) => {
    const decoded = { preferred_username: "john@example.com" };

    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      callback(null, decoded);
    });

    db.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      merge: jest.fn().mockResolvedValue(),
    });

    verifyToken(req, res, next);

    setImmediate(() => {
      expect(global.userEmail).toBe("john@example.com");
      expect(req.user).toEqual(decoded);
      expect(next).toHaveBeenCalled();
      done();
    });
  });

  it("should handle DB error gracefully", (done) => {
    const decoded = { preferred_username: "error@example.com" };

    jwt.verify.mockImplementation((token, getKey, options, callback) => {
      callback(null, decoded);
    });

    db.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      merge: jest.fn().mockRejectedValue(new Error("DB insert failed")),
    });

    const consoleSpy = jest.spyOn(console, "error").mockImplementation();

    verifyToken(req, res, next);

    setImmediate(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Error inserting into Users table:",
        expect.any(Error)
      );
      expect(next).toHaveBeenCalled();
      consoleSpy.mockRestore();
      done();
    });
  });

  it("should verify that correct token is passed to jwt.verify", (done) => {
    const token = req.headers.authorization.split(" ")[1];
    jwt.verify.mockImplementation((tkn, getKey, options, callback) => {
      expect(tkn).toBe(token);
      callback(null, { preferred_username: "check@example.com" });
    });

    db.mockReturnValue({
      insert: jest.fn().mockReturnThis(),
      onConflict: jest.fn().mockReturnThis(),
      merge: jest.fn().mockResolvedValue(),
    });

    verifyToken(req, res, next);

    setImmediate(() => {
      expect(next).toHaveBeenCalled();
      done();
    });
  });
});
