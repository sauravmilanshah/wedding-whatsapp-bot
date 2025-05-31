if (process.env.NODE_ENV !== 'production' || !process.env.OPENAI_API_KEY) {
    require('dotenv').config();
}
// server-full.js - Complete LLM-powered Wedding WhatsApp Bot Backend
const express = require('express');
const bodyParser = require('body-parser');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const cors = require('cors');
const OpenAI = require('openai');
//require('dotenv').config();


const app = express();
const prisma = new PrismaClient();

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Wedding context for the LLM
const WEDDING_CONTEXT = `You are a friendly and helpful wedding assistant bot for a wedding at Oleander Farms, Karjat from January 14-17, 2026.

IMPORTANT RULES:
1. Be warm, friendly, and conversational - this is a joyous occasion!
2. Always extract and confirm: Full Name, RSVP status (Yes/No), Number of guests
3. For confirmed guests, also collect: Transport mode, Arrival date/time, Dietary restrictions
4. Use emojis appropriately to keep the mood festive 🎉
5. If asked about events, provide relevant schedule based on their invitation dates
6. Keep responses concise but friendly - this is WhatsApp!
7. When you receive information from guests, ALWAYS use the update_guest_info function to save it!

GUEST CATEGORIES:
- Full Wedding (Jan 14-17): Can attend all events
- Main Wedding Only (Jan 15-17): Can attend from Jan 15 onwards

EVENT SCHEDULE:
Jan 14: Guest Check-in (12pm), Mehandi (5:30pm), Welcome Dinner (7:30pm)
Jan 15: Haldi (10:30am), Wedding Ceremony (6pm), Reception (7:30pm)
Jan 16: Lunch (12:30pm), Sangeet & After Party (9pm)
Jan 17: Breakfast & Check-out (11am)

VENUE: Oleander Farms, Karjat (2 hours from Mumbai by road)

CRITICAL: Whenever a guest provides their name, RSVP status, or guest count, you MUST call the update_guest_info function to save this information to the database. This is required for every piece of information received.`;

// Test endpoint
app.get('/test', (req, res) => {
  res.json({ message: 'Wedding bot server is running!', version: 'full' });
});

// Get or create guest
async function getOrCreateGuest(phoneNumber, weddingId) {
  let guest = await prisma.guest.findFirst({
    where: { 
      phoneNumber,
      weddingId 
    }
  });

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        phoneNumber,
        weddingId
      }
    });
  }

  return guest;
}

// Get recent conversations
async function getRecentConversations(guestId) {
  return await prisma.conversation.findMany({
    where: { guestId },
    orderBy: { createdAt: 'desc' },
    take: 10
  });
}

// WhatsApp webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const { From, Body } = req.body;
    const phoneNumber = From.replace('whatsapp:', '');
    
    console.log(`Received message from ${phoneNumber}: ${Body}`);
    
    // Get the first wedding
    const wedding = await prisma.wedding.findFirst({
      where: { isActive: true }
    });

    if (!wedding) {
      const twiml = new twilio.twiml.MessagingResponse();
      twiml.message('Wedding bot is not configured yet. Please contact support.');
      res.type('text/xml');
      return res.send(twiml.toString());
    }

    // Get or create guest
    const guest = await getOrCreateGuest(phoneNumber, wedding.id);
    
    // Get conversation history
    const conversations = await getRecentConversations(guest.id);
    
    // Build conversation history for OpenAI
    const conversationHistory = conversations
      .map(conv => ({
        role: conv.role,
        content: conv.content
      }))
      .reverse();

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: Body
    });

    // Create guest info context
    let guestContext = `\n\nCURRENT GUEST INFO:\n`;
    guestContext += `Phone: ${guest.phoneNumber}\n`;
    guestContext += `Name: ${guest.name || 'Not provided yet'}\n`;
    guestContext += `RSVP: ${guest.rsvpStatus || 'Not confirmed'}\n`;
    guestContext += `Guest Count: ${guest.guestCount || 'Not specified'}\n`;

    // Call OpenAI with function calling
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: WEDDING_CONTEXT + guestContext
        },
        ...conversationHistory
      ],
      temperature: 0.7,
      max_tokens: 300,
      tools: [
        {
          type: "function",
          function: {
            name: "update_guest_info",
            description: "Update guest information in the database",
            parameters: {
              type: "object",
              properties: {
                name: { type: "string", description: "Guest's full name" },
                rsvpStatus: { type: "string", enum: ["YES", "NO", "MAYBE"], description: "RSVP status" },
                guestCount: { type: "number", description: "Total number of guests" },
                transportMode: { type: "string", description: "How they're arriving" },
                arrivalDateTime: { type: "string", description: "When they're arriving" },
                dietaryRestrictions: { type: "string", description: "Any dietary needs" }
              }
            }
          }
        }
      ],
      tool_choice: "auto"
    });

    console.log("AI Response:", JSON.stringify(completion.choices[0].message, null, 2));
    
    const aiResponse = completion.choices[0].message.content;
    
    // Handle function calls from the LLM
    if (completion.choices[0].message.tool_calls) {
      for (const toolCall of completion.choices[0].message.tool_calls) {
        if (toolCall.function.name === "update_guest_info") {
          const updates = JSON.parse(toolCall.function.arguments);
          console.log("LLM extracted info:", updates);
          
          // Update guest with LLM-extracted data
          await prisma.guest.update({
            where: { id: guest.id },
            data: updates
          });
        }
      }
    }

    // Save conversation
   // Save conversation
   await prisma.conversation.create({
    data: {
      guestId: guest.id,
      role: 'user',
      content: Body
    }
  });

  // Only save assistant message if there's content
  if (aiResponse) {
    await prisma.conversation.create({
      data: {
        guestId: guest.id,
        role: 'assistant',
        content: aiResponse
      }
    });
  } else {
    // If no content but function was called, create a confirmation message
    await prisma.conversation.create({
      data: {
        guestId: guest.id,
        role: 'assistant',
        content: "Thank you! I've updated your information. ✅"
      }
    });
  }

    // Update last message time
    await prisma.guest.update({
      where: { id: guest.id },
      data: { lastMessageAt: new Date() }
    });

    // Send response
    const twiml = new twilio.twiml.MessagingResponse();
    const responseMessage = aiResponse || "Thank you! I've updated your information. ✅";
    twiml.message(responseMessage);
    
    res.type('text/xml');
    res.send(twiml.toString());

  } catch (error) {
    console.error('Webhook error:', error);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('Sorry, I encountered an error. Please try again or contact the wedding coordinator.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// API endpoint to get all guests
app.get('/api/guests', async (req, res) => {
  try {
    const guests = await prisma.guest.findMany({
      include: {
        conversations: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get guest details with conversations
app.get('/api/guests/:guestId', async (req, res) => {
  try {
    const guest = await prisma.guest.findUnique({
      where: { id: req.params.guestId },
      include: {
        conversations: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });
    res.json(guest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Test it at: http://localhost:${PORT}/test`);
  console.log(`WhatsApp webhook: http://localhost:${PORT}/webhook`);
});