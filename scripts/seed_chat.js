/**
 * Dummy Chat Seed Script
 * Employees ke beech dummy chat room + messages create karta hai
 * Run: node scripts/seed_chat.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const ChatRoom = require('../models/ChatRoom');
const Message = require('../models/Message');
const AuthEmployee = require('../models/AuthEmployee.model');

const EMP1 = '69cab1afccbfabf7be03293a';
const EMP2 = '69c422089c5cbdd48f25bbcd';

const MESSAGES = [
    { sender: EMP1, text: 'Bhai kal meeting kitne baje hai? 🕐' },
    { sender: EMP2, text: 'Kal 10 baje hai, conference room mein.' },
    { sender: EMP1, text: 'Theek hai, main aa jaunga. Koi presentation chahiye?' },
    { sender: EMP2, text: 'Haan, apni Q1 report le aana.' },
    { sender: EMP1, text: 'Done! 👍 Koi aur kuch??' },
    { sender: EMP2, text: 'Nahi bas yahi tha. See you tomorrow! 🙌' },
    { sender: EMP1, text: 'Okay bhai, bye! 😄' },
    { sender: EMP2, text: 'Ek kaam aur — attendance sheet bhi check kar lena apni.' },
    { sender: EMP1, text: 'Haan dekhi thi, sab theek hai.' },
    { sender: EMP2, text: 'Perfect! 🔥 Kal milte hain.' },
];

async function seed() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ MongoDB Connected');

        // Employees ke companyId fetch karo
        const emp1 = await AuthEmployee.findById(EMP1).select('company firstName');
        const emp2 = await AuthEmployee.findById(EMP2).select('company firstName');

        if (!emp1) {
            console.error(`❌ Employee 1 (${EMP1}) nahi mila!`);
            process.exit(1);
        }
        if (!emp2) {
            console.error(`❌ Employee 2 (${EMP2}) nahi mila!`);
            process.exit(1);
        }

        console.log(`👤 Emp1: ${emp1.firstName} | Company: ${emp1.company}`);
        console.log(`👤 Emp2: ${emp2.firstName} | Company: ${emp2.company}`);

        const companyId = emp1.company;

        // Check karein existing direct room toh nahi hai
        let room = await ChatRoom.findOne({
            type: 'direct',
            participants: { $all: [EMP1, EMP2] },
            company: companyId
        });

        if (room) {
            console.log(`ℹ️  Chat room already exists: ${room._id}`);
        } else {
            room = await ChatRoom.create({
                type: 'direct',
                participants: [EMP1, EMP2],
                company: companyId
            });
            console.log(`🆕 Chat room created: ${room._id}`);
        }

        // Messages add karo
        let lastMessage;
        const now = new Date();

        for (let i = 0; i < MESSAGES.length; i++) {
            const msgTime = new Date(now.getTime() - (MESSAGES.length - i) * 5 * 60 * 1000); // Har 5 min pehle

            const msg = await Message.create({
                chatRoom: room._id,
                sender: MESSAGES[i].sender,
                text: MESSAGES[i].text,
                createdAt: msgTime,
                updatedAt: msgTime
            });

            lastMessage = msg;
            console.log(`💬 Message [${i + 1}/${MESSAGES.length}]: "${MESSAGES[i].text.substring(0, 30)}..."`);
        }

        // ChatRoom ka lastMessage update karo
        await ChatRoom.findByIdAndUpdate(room._id, {
            lastMessage: lastMessage._id,
            updatedAt: now
        });

        console.log('\n✅ Seed complete!');
        console.log(`📦 Room ID: ${room._id}`);
        console.log(`💬 Total Messages: ${MESSAGES.length}`);

    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await mongoose.disconnect();
        console.log('🔌 MongoDB Disconnected');
    }
}

seed();
