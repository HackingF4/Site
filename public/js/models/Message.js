class Message {
    constructor(sender, content, timestamp) {
        this.sender = sender;
        this.content = content;
        this.timestamp = timestamp || new Date();
    }

    static fromJSON(json) {
        return new Message(json.sender, json.content, new Date(json.timestamp));
    }

    toJSON() {
        return {
            sender: this.sender,
            content: this.content,
            timestamp: this.timestamp
        };
    }
}