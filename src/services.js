const debug = require("./debug");
const env = require("./env");
const db = require("./database");
const uuid = require("uuid/v1")

const axios = require("axios");

var short = require('short-uuid');
var translator = short();
var decimalTranslator = short("0123456789");
var cookieTranslator = short(short.constants.cookieBase90);

//export db agnostic services
module.exports = {
  getAll: async () => {
    return await db.getAll();
  },
  retweet: async (parent, username) => {
    //added await
    await db.retweet(parent, username)
  },
  addItem: async (content, childType, parent, media, username) => {
    debug.log("ADDITEM SERVICE")
    // let id = translator.new();
    let ret = {};

    if (!content) {
      ret.status = env.statusError
      return ret
    }
    let item = {
      content: content,
      childType: childType,
      username: username,
      parent: parent,
      media: media,
      timestamp: (new Date())
    }
    debug.log("before adding item, this is the item body: " + JSON.stringify(item));
    let url = env.baseUrl + "/used/" + media + "/" + username;
    let check = -1;
    if (media) {
      for (let i = 0; i < media.length; i++) {
        //await
        check = (await axios.get('http://hackguy.cse356.compas.cs.stonybrook.edu' + "/used/" + media[i] + '/' + username)).data.used

        if (check !== '0') {
          ret.status = env.statusError
          return ret
        } else {
          check = (await axios.post('http://hackguy.cse356.compas.cs.stonybrook.edu' + "/used/" + media[i])).data.used
        }

      }
    }

    /*
    serve multiple requests, and return at once

    */
    ret = await db.addItem(item);
    return ret;
  },
  /*
  getItemById: async (id)=>{
      let ret = await db.getItemById(id);
      debug.log("RETURNING ITEM: " + ret);
      return ret;
  },*/
  getItemById: async (id) => {
    let ret = await db.getItemById(id);
    debug.log("GETTING ITEM: " + ret);
    return ret;
  },
  deleteItemById: async (id, username) => {
    let item = await db.getItemById(id);
    let ret = {};
    debug.log("DELETE_SERVICE: ITEM " + JSON.stringify(item))
    if (item.item && item.item.username === username) {
      ret = await db.deleteItemById(id, username, item);
      debug.log("DELETEING ITEM: " + ret);

      return ret;
    } else {
      debug.log("USER DOES NOT OWN POST")
      return {
        status: {
          status: "error"
        }
      }
    }

  },
  search: async (timestamp, limit, username, following, currentUser, queryString, rank, parent, replies, hasMedia) => {
    if (limit === "undefined") {
      limit = undefined;
    }
    return db.search(timestamp, limit, username, following, currentUser, queryString, rank, parent, replies, hasMedia)
  },
  authorize: (cookie) => {
    debug.log("cookie " + (cookie !== "" && cookie !== undefined));
    return (cookie !== "" && cookie !== undefined);
  },
  searchByUsername: (username, limit) => {
    return db.searchByUsername(username, limit)
  },
  likeItem: async (itemID, like, currentUser) => {
    return db.likeItem(itemID, like, currentUser)
  }


}