module.exports = {
    secret: process.env.JWT_SECRET || 'your_super_secret_jwt_key', // Use uma chave forte em produção
    expiresIn: '1h'
};