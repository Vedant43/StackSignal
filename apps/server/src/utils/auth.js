import bcrypt from 'bcrypt';

export const hashPassword = (password, saltRound) => {
    return bcrypt.hash(password, saltRound);
}