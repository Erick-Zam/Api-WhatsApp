import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'super-secret-key-change-in-prod';

export const verifyJwt = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }

    const token = authHeader.split(' ')[1]; // Bearer <token>

    try {
        const decoded = jwt.verify(token, SECRET_KEY);
        req.user = decoded; // Attach full payload (including id, email, role)
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
};
