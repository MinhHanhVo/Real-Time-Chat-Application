import jwt from 'jsonwebtoken'
import 'dotenv/config'

const generateToken = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, {
        expiresIn: "7d"
    })
    res.cookie("jwt", token, {
        maxAge: 7 * 24 * 60 * 60 * 1000,
        httpOnly: true, // XSS attacks
        sameSite: "strict",// CSRF attack
        secure: process.env.NODE_ENV !== "development"
    })
    return token;
}
export default generateToken;