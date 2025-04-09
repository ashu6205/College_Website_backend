require('dotenv').config();
const { app, server } = require('./src/app');  // Destructure both app and server

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
});