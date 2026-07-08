// Временный debug в handleZovCallback
module.exports.handleZovCallback = async function(context) {
    console.log('ZOV DEBUG - eventPayload:', JSON.stringify(context.eventPayload));
    console.log('ZOV DEBUG - senderId:', context.senderId);
    console.log('ZOV DEBUG - userId:', context.userId);
    console.log('ZOV DEBUG - peerId:', context.peerId);
    return false;
};
