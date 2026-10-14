import jwt from 'jsonwebtoken';

export const generateToken = (userId, tokenVersion = 0) => {
  return jwt.sign(
    {
      id: userId,
      tv: Number(tokenVersion) || 0,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};


