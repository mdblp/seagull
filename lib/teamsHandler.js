const axios = require('axios');

const url = process.env.TEAMS_HOST;

async function request(tidepoolToken,path) {
    let config = {
        headers: {
            "x-tidepool-session-token": tidepoolToken,
        }
    }
    try {
        const res = await axios.get(`${url}${path}`, config);
        return res;
    } catch (error) {
        if (error.response) {
            throw error.response
        } else {
            throw {status:500,message:"Internal error"}
        }
    }
}
async function getTeams(tidepoolToken) {
    const res = await request(tidepoolToken,'/teams');
    return res.data;
}
async function getPatients(tidepoolToken) {
    const res = await request(tidepoolToken,'/patients');
    return res.data;
}
module.exports = {
    getTeams: getTeams,
    getPatients: getPatients
};
