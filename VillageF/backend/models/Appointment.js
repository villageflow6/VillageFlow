const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    userId: { type: String, required: true },
    userName: { type: String, required: true },
    nic: { type: String, required: true },
    reason: { type: String, required: true },
    date: { type: String, required: true },
    time: { type: String, required: true },
    status: { type: String, default: 'Pending' },
    userEmail: { type: String } 
}, { timestamps: true });

module.exports = mongoose.model('Appointment', AppointmentSchema);