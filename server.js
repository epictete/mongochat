const app = require("express")();
const http = require("http").createServer(app);
const MongoClient = require("mongodb").MongoClient;
const io = require("socket.io")(http);
const colors = require("colors");

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

// Connect to mongo
MongoClient.connect(
    "mongodb+srv://dev123:dev123@epictete.ahqdx.mongodb.net/mongochat?retryWrites=true&w=majority",
    { useNewUrlParser: true, useUnifiedTopology: true },
    (err, client) => {
        if (err) throw err;

        console.log("[database] MongoDB connected...".magenta);

        // Connect to Socket.io
        io.on("connection", socket => {
            let chat = client.db("mongochat").collection("chats");

            // Create function to send status
            const sendStatus = s => {
                socket.emit("status", s);
            };

            // Get chats from Mongo collection
            chat.find()
                .limit(100)
                .sort({ _id: 1 })
                .toArray((err, res) => {
                    if (err) throw err;

                    // Emit the messages
                    socket.emit("output", res);
                });

            // Handle input events
            socket.on("input", data => {
                let name = data.name;
                let message = data.message;

                // Check for name and message
                if (name == "" || message == "") {
                    sendStatus("Please enter a name and message");
                } else {
                    // Insert message
                    chat.insertOne({ name, message }, () => {
                        io.emit("output", [data]);

                        // Send status object
                        sendStatus({
                            message: "Message sent",
                            clear: true,
                        });
                    });
                }
            });

            // Handle clear
            socket.on("clear", data => {
                // Remove all chats from collection
                chat.deleteMany({}, () => {
                    // Emit cleared
                    socket.emit("cleared");
                });
            });
        });
    }
);

http.listen(4000, () => {
    console.log("[server] Listening on port 4000".cyan);
});
