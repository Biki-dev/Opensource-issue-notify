

const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const connectDB = async () => {
    try {
        const uri = process.env.MONGO_URI;
        console.log(`Attempting to connect to: ${uri}`);

        await mongoose.connect(uri);
        console.log(`MongoDB Connected: ${mongoose.connection.host}`);
    } catch (error) {
        console.error(`Local MongoDB Connection Failed: ${error.message}`);
        console.log('Falling back to In-Memory MongoDB (Dev Mode)...');

        try {
            const mongod = await MongoMemoryServer.create();
            const uri = mongod.getUri();
            console.log(`In-Memory MongoDB started at: ${uri}`);

            await mongoose.connect(uri);
            console.log('MongoDB Connected (In-Memory)');
        } catch (memError) {
            console.error(`In-Memory Setup Failed: ${memError.message}`);
            process.exit(1);
        }
    }
};

module.exports = connectDB;
