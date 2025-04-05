const axios = require('axios');
const fs = require('fs');

module.exports = {
    config: {
        name: "ai88",
        version: "2.0.0",
        role: 0,
        author: "Jonell Magallanes (modified by Sman12345678)",
        shortDescription: "AI Chat Assistant",
        countDown: 0,
        category: "ai",
        guide: {
            en: 'Just chat normally with the AI'
        },
        // Add this to make it work without prefix
        noPrefix: true
    },

    onLoad: async function () {
        // Initialize conversation history storage
        if (!global.GoatBot.data.hasOwnProperty('conversationHistory')) {
            global.GoatBot.data.conversationHistory = {};
        }
    },

    onStart: async function ({ api, event, args }) {
        // If this is a bot command with prefix, ignore it
        if (event.body.startsWith(global.GoatBot.config.prefix)) return;

        const threadID = event.threadID;
        const userID = event.senderID;
        const content = event.body;

        // Initialize conversation history for the thread if it doesn't exist
        if (!global.GoatBot.data.conversationHistory[threadID]) {
            global.GoatBot.data.conversationHistory[threadID] = {};
        }
        
        // Initialize user's conversation history if it doesn't exist
        if (!global.GoatBot.data.conversationHistory[threadID][userID]) {
            global.GoatBot.data.conversationHistory[threadID][userID] = [];
        }

        const userHistory = global.GoatBot.data.conversationHistory[threadID][userID];
        
        // Keep only last 5 messages for context
        if (userHistory.length > 5) {
            userHistory.shift();
        }

        // Add current message to history
        userHistory.push({
            role: 'user',
            content: content,
            timestamp: Date.now()
        });

        // Construct conversation context
        const conversationContext = userHistory
            .map(msg => `${msg.role}: ${msg.content}`)
            .join('\n');

        // Encode the conversation with context
        const encodedContent = encodeURIComponent(`Previous conversation:\n${conversationContext}\n\nCurrent message: ${content}`);

        try {
            const apiUrl = `https://aiapiviafastapiwithimagebyjonellmagallanes.replit.app/ai?content=${encodedContent}`;
            
            // Send typing indicator
            api.sendTypingIndicator(event.threadID);

            const response = await axios.get(apiUrl);
            const { request_count, airesponse, image_url } = response.data;

            if (airesponse) {
                // Add AI response to conversation history
                userHistory.push({
                    role: 'assistant',
                    content: airesponse,
                    timestamp: Date.now()
                });

                // Send text response
                await api.sendMessage(airesponse, event.threadID, event.messageID);

                // Handle image if present
                if (image_url) {
                    const imagePath = './cache/ai_response_image.jpg';
                    const imageResponse = await axios.get(image_url, { responseType: 'arraybuffer' });
                    fs.writeFileSync(imagePath, Buffer.from(imageResponse.data));

                    await api.sendMessage({ 
                        attachment: fs.createReadStream(imagePath) 
                    }, event.threadID, () => {
                        fs.unlinkSync(imagePath);
                    });
                }
            }
        } catch (error) {
            console.error('AI Response Error:', error);
            api.sendMessage("😅 Sorry, I encountered an error while processing your message. Please try again!", event.threadID);
        }
    }
};
