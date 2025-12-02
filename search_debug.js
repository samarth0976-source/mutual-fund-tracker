import axios from 'axios';

async function search() {
    try {
        const response = await axios.get("https://groww.in/v1/api/search/v1/entity?app=false&page=0&q=reliance");
        console.log(JSON.stringify(response.data.content[0], null, 2));
    } catch (e) {
        console.error(e);
    }
}
search();
