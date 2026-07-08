const axios = require('axios');
const logger = require('./logger.js');

 
const accessToken = 'vk1.a.86BZ9smHc7kWkfAGwHN9Svz1ZhX_4NoHPKYbx6qChh47xFazBjZ7xb6l089Ea2n5PaAcV2lZ1cf9mXDrSCZoqb8BuaYYheT5SBiJLKdrO4jRcZKgmptwwqP7Z9pJpHldkp79TKsbhT-2J57NHZhJtaNtdQPdTCAgaj60w9VpnIy_bbW2OSxvLv637_tYLW8mDumRiYV9HroWKBzc2V9Wdg

 
const requestUrl = `https://api.vk.com/method/friends.getRequests?fields=first_name,last_name&access_token=${accessToken}&v=5.131`;

 
async function vkApiRequest(url) {
    try {
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        logger.error('Error making API request:', error);
        return null;
    }
}

 
async function acceptFriendRequest(userId, accessToken) {
    const acceptUrl = `https://api.vk.com/method/friends.add?user_id=${userId}&access_token=${accessToken}&v=5.131`;
    const response = await vkApiRequest(acceptUrl);
    if (response && response.response === 1) {
        logger.log(`Accepted friend request from user ID: ${userId}`);
    } else {
        logger.log(`Failed to accept friend request from user ID: ${userId}`);
    }
}

 
async function main() {
    const response = await vkApiRequest(requestUrl);

    if (response && response.response && Array.isArray(response.response.items)) {
        for (const user of response.response.items) {
            await acceptFriendRequest(user.id, accessToken);
        }
    } else {
        logger.log("No friend requests to process.");
    }
}

 
setInterval(main, 30000);

 
main();
