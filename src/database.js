const env = require("./env");
const debug = require("./debug");
const { Client } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://130.245.171.109:9200' })

const index = "tests20";
const type = "test20";
const axios = require("axios");

//define database specific tasks here
module.exports={
     getItemById: async (id)=>{
          let status = env.statusOk;
          let error;
          let item;
          //post to image_service
          const response = await client.search({
               index: index,
               type: type,
               body: {
                 query: {
                   match: {
                     _id: id
                   }
                 }
               }

          }).catch((e)=>{
               debug.log(e);
               status = env.statusError;
               error = "error";
          })
          if(response && response.body && response.body.hits.hits[0]){
               item = response.body.hits.hits[0]._source;
               debug.log("item: " + JSON.stringify(item));
          }
	  if(item){
	       item.id = id
	  }
          let result = {
               status: status,
               item: item,
               error: error
          }

          debug.log(JSON.stringify(result));
          return result;
     },
     deleteItemById: async (id)=>{
          let status = env.statusOk;
          let error;
          let item;
          //post to image_service
          debug.log("DATABASE_DELETE: deleteItemById")
          const response = await client.deleteByQuery({
               index: index,
               type: type,
               body: {
                 query: {
                   match: {
                     _id: id
                   }
                 }
               }

          }).catch((e)=>{
               debug.log(e);
               status = env.statusError;
               error = "error";
          })

          let result = {
               status: status,
               numDeleted: response.body.deleted,
               error: error
          }

          debug.log(JSON.stringify(result));
          return result;
     },
     search: async (timestamp, limit, username, following, currentUser, queryString, rank, hasMedia, replies)=>{
          //could have issue with 200 limit of following

          let status = env.statusOk;
          let error;
          let item;
          debug.log("qs: "+ queryString)

          if(!limit){
               limit = 25;
          }
          if(limit > 100){
               debug.lot("to large");
               limit = 100;
          }
          if(!timestamp){
               timestamp = (new Date() / 1000)
          }
          let queryBody ={
               query: {
                    bool:{
                         must:[
                              {
                                   range : {
                                        timestamp : {
                                             lte : timestamp
                                        }
                                   }
                              }]
                         }
               }
          }

          if(following || following == undefined || following == 'true'){
               let url = env.baseUrl + "/user/" + currentUser +  '/following'
               followingArray = (await axios.get(url)).data.users;
               let followstr = ''
               // for(let i = 0; i < followingArray.length;i++){
               //      followstr = followingArray[i] + " ";
               // }
               queryBody.query.bool.must.push({
                    simple_query_string : {
                         query: followstr,
                         fields: ["username"]
                    }
               })

          }
          if(queryString){
               queryBody.query.bool.must.push({
                    simple_query_string : {
                         query: queryString,
                         fields: ["content"]
                    }
               })
          }
          if(username){
               queryBody.query.bool.must.push({
                    match: {
                        username : username
                   }
               })
          }

          if(hasMedia){
               queryBody.query.bool.must_not({
                    match : {
                         media : []
                    }
               })
          }

          if(parent != "none" || parent != undefined){
               queryBody.query.bool.must({
                    match: {
                         id : parent 
                    }
               })
          }

          if(replies === false){
               queryBody.query.bool.must_not({
                    match : {
                         childType: "reply"
                    }
               })
          }

          if(rank === "time"){
               queryBody.sort =  [{"timestamp" : "desc"}]
               
          }
          else if(rank === "interest" || rank == undefined){
               queryBody.sort = [{"property.likes" : "desc"}]
          }

          //TODO
          debug.log("queryBody" + JSON.stringify(queryBody))
          let test = "testExample test"
          const response = await client.search({
               index: index,
               type: type,
               size : limit,
               body: queryBody



          }).catch((e)=>{
              debug.log(e);
              status = env.statusError;
              error = "error";
          });
          debug.log(JSON.stringify(response))
	     if(response){
               return response.body.hits.hits.map((elm)=>{
                    let ret = elm._source;
                    ret.id = elm._id;
                    //debug.log("response element is  " + elm);
                    debug.log("ret is " + ret);
	               return ret;
	          })
          }else{
               return []
          }
     },

     searchByUsername: async (username, limit)=>{
          let status = env.statusOk;
          let error;
          let item;
          if(!limit){
               debug.log(limit)
               limit = 50;
          }
          if(limit > 200){
               debug.lot("to large");
               limit = 200;
          }
          debug.log("username" + username)
          const response = await client.search({
               index: index,
               type: type,
               size : limit,
               body:{
                    query: {
                         match: {
                           username: username
                         }
                   }
               }
         }).catch((e)=>{
              debug.log(e);
              status = env.statusError;
              error = "error";
         })
          debug.log(JSON.stringify(response))
       if(response){
              return response.body.hits.hits.map((elm)=>{
                ret = elm._id;
               return ret;
           })
          return {}
       }
     },

     addItem: async (item)=>{
          let status = env.statusOk;
          let error;
          let id;
          
          const response = await client.index({
               index: index,
               type: type,
               body: {
                    content: item.content,
                    childType: item.childType,
                    username: item.username,
                    timestamp: item.timestamp,
                    retweeted: 0,
                    property: { likes: 0 },
                    usersWhoLiked: [],
                    media: []
                 }
          }).catch((e)=>{
               debug.log(e);
               status = env.statusError;
               error = "error";
          })
          if(response.body){
               id = response.body._id
               debug.log(id);
          }
          let result = {
               status: status,
               id: id,
               error: error
          }
          debug.log(JSON.stringify(response));
          return result;
     },
     getAll: async ()=>{
	const response = await client.search({
               index: index,
               type: type,
         }).catch((e)=>{
              debug.log(e);
              status = env.statusError;
              error = "error";
         })
          debug.log(JSON.stringify(response))
          if(response){
              return response.body.hits.hits.map((elm)=>{
                  if(elm.timestamp === timestamp){ return  }
                  let ret = elm._source;
                  ret.id = elm._id;
                  return ret;
              })
          return {}
          }
     },
     likeItem: async(id, like, currentUser)=>{
          getItemResult = await module.exports.getItemById(id)
          //console.log("get Item Result is " + JSON.stringify(getItemResult));
          //console.log("item in get itemresult is " + JSON.stringify(getItemResult.item.property));

          //If Item exists
          if(getItemResult.item){
               //getItemResult.usersWhoLiked = [currentUser];

               //usersLiked.push(currentUser);
               //getItemResult.usersWhoLiked = [currentUser, "dude"];
               var usersLiked;
               debug.log("Previous likes for this item " + JSON.stringify(getItemResult.item.itemusersWhoLiked));
               /*
               if(getItemResult.usersWhoLiked){
                    usersLiked = JSON.parse(JSON.stringify(getItemResult.item.usersWhoLiked));
               }
               else{
                    getItemResult.usersWhoLiked = ["dude"]; //Add dummy user
                    usersLiked = JSON.parse(JSON.stringify(getItemResult.item.usersWhoLiked));
               }

               */
               usersLiked = JSON.parse(JSON.stringify(getItemResult.item.usersWhoLiked));
               var userAlreadyLiked = usersLiked.includes(currentUser)
               if(like === true || like === "true"){
                    debug.log("Like field is " + like);

                    debug.log("userAlreadyLiked " + userAlreadyLiked);
                    debug.log("usersLiked " + usersLiked);
                    if(userAlreadyLiked){    //Current user already has this item liked
                         debug.log("current user already exists in array");
                         //Return status ok, since current user already has this item liked
                    }
                    else{    //Modify DB, as user now likes this item
                         debug.log("User does not exist in array, so add it");
                         getItemResult.item.property.likes += 1;
                         usersLiked.push(currentUser);
                         var sourceData = {
                              doc: {
                                   "id": getItemResult.item.id,
                                   "content": getItemResult.item.content,
                                   "username": getItemResult.item.username,
                                   "timestamp": getItemResult.item.timestamp,
                                   "retweets": getItemResult.item.retweets,
                                   "property": getItemResult.item.property,
                                   "usersWhoLiked": usersLiked,
                                   "media": getItemResult.media
                              }
                         };
                         var docParam = {
                              id: getItemResult.item.id,
                              index: index,
                              type: type,
                              body: sourceData
                         }
                         var response = await client.update(docParam, sourceData);
                         debug.log("The response from update was" + JSON.stringify(response));
                    }
                    debug.log("Current list of likes is " + getItemResult.usersWhoLiked);
               }
               else{     //Unlike the item

                    if(userAlreadyLiked){
                         debug.log("Time to unlike item");
                         getItemResult.item.property.likes -= 1;
                         var indexOfUser = usersLiked.indexOf(currentUser);
                         if(indexOfUser > -1){ usersLiked.splice(indexOfUser, 1);}
                         debug.log("After unliking, usersLiked is " + usersLiked);
                         var usersLikedAssignment;
                         if(!usersLiked){
                              usersLikedAssignment = []
                         }
                         else{ usersLikedAssignment = usersLiked;}
                         var sourceData = {
                              doc: {
                                   "id": getItemResult.item.id,
                                   "content": getItemResult.item.content,
                                   "username": getItemResult.item.username,
                                   "timestamp": getItemResult.item.timestamp,
                                   "retweets": getItemResult.item.retweets,
                                   "property": getItemResult.item.property,
                                   "usersWhoLiked": usersLikedAssignment,
                                   "media": getItemResult.media
                              }
                         };
                         var docParam = {
                              id: getItemResult.item.id,
                              index: index,
                              type: type,
                              body: sourceData
                         };
                         var response = await client.update(docParam, sourceData)/*.catch(err =>{
                              debug.log(err);
                         }); */
                         debug.log("The response from update " + JSON.stringify(response));

                    }
                    else{
                         //Current user does not like item, so nothing to unlike
                         //Dont do anything and return ok? Check piazza post
                    }
               }


               debug.log("Amount of likes in item is now " + JSON.stringify(getItemResult.item.property));
               debug.log("Updated list of likers " + JSON.stringify(getItemResult.usersWhoLiked));
               debug.log("Updated array object of likers " + usersLiked);
               //console.log("Num likes for this item is now", item.property.likes);

          }
          else{
               //Item does not exist
               //Return error
          }
          return {}
     }
}
