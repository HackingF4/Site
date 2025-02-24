require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const email = process.argv[2];

if (!email) {
  console.error('Please provide an email address as an argument');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    try {
      const user = await User.findOneAndUpdate(
        { email: email.toLowerCase() },
        { role: 'admin' },
        { new: true }
      );

      if (!user) {
        console.error('User not found');
      } else {
        console.log('User updated successfully:', user.username, 'is now an admin');
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      mongoose.disconnect();
    }
  })
  .catch(error => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });