const env = require("./env");
const debug = require("./debug");
const { Client,  RequestParams } = require('@elastic/elasticsearch')
const client = new Client({ node: 'http://130.245.171.109:9200' })
const service = require("./services");
const index = "tests2000";
const type = "test2000";
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
               debug.log(JSON.stringify(response.body.hits.hits[0]))
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
     deleteItemById: async (id, username, itemIn)=>{
          let status = env.statusOk;
          let error;
          let item;
          //post to image_service
          debug.log("DATABASE_DELETE: deleteItemById")
          getItemResult = itemIn
          debug.log(JSON.stringify(getItemResult))
          if(getItemResult.item.childType === "retweet" && getItemResult.item.parent) {
            debug.log("DELETEING RETWEET BITCH")
            var res2 = await client.update({
                              index: index,
                              id: getItemResult.item.parent,
                              body:{
                                   "script": {
                                        "source":"ctx._source.retweeted--;",
                                        "params":{
                                             "user" : username
                                        }
                                   }
                              }
                  }).catch((e)=>{console.log(e)});
          }


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
     search: async (timestamp, limit, username, following, currentUser, queryString, rank, parent, replies, hasMedia)=>{
          //could have issue with 200 limit of following

          let status = env.statusOk;
          let error;
          let item;
          debug.log("qs: "+ queryString)

          if(!limit){
               limit = 25;
          }
          if(limit > 100){
               debug.log("to large");
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
                                   }
                              ],
                         must_not:[]
                    }
               }
          }
          if(following || following == undefined || following == 'true'){
               debug.log("Check if there is a current user when 'following' marked true in search: " + currentUser)
               if(currentUser){
                    debug.log("current user in following field check for search is " + currentUser);
                    let url = env.baseUrl + "/user/" + currentUser +  '/following'
                    followingArray = (await axios.get(url)).data.users;
                    debug.log("following Array" + followingArray);
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
                    debug.log(queryBody);
               }
               else{
                    debug.log("not authorized, cant use following in search");
               }
          }
          else{
               debug.log("following is false");
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
               queryBody.query.bool.must_not.push({
                    match : {
                         media : "empty"
                    }
               });
          }
          
          if(parent != undefined){
               queryBody.query.bool.must.push({
                    match: {
                         id : parent
                    }
               });
          }

          if(replies === false){
               queryBody.query.bool.must_not.push({
                    match : {
                         childType: "reply"
                    }
               });
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
               debug.log("to large");
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
          var media;
          if(!item.media){
               media = "empty";
          }
          else{
               media = item.media;
          }

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
                    media: media,
                    parent: item.parent
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
               debug.log("Previous likes for this item " + JSON.stringify(getItemResult.item.itemusersWhoLiked));
               var usersLiked = JSON.parse(JSON.stringify(getItemResult.item.usersWhoLiked));
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
                         var response = await client.update({
                              index: index,
                              id,
                              body:{
                                   "script": {
                                        "source":"ctx._source.property.likes++; ctx._source.usersWhoLiked.add(params.user)",
                                        "params":{
                                             "user" : currentUser
                                        }
                                   }
                              }
                         });
                         debug.log("The response from update was" + JSON.stringify(response));
                    }
                    debug.log("Current list of likes is " + getItemResult.usersWhoLiked);
               }
               else{     //Unlike the item

                    if(userAlreadyLiked){
                         debug.log("Time to unlike item");
                         var response = await client.update({
                              index: index,
                              id,
                              body:{
                                   "script": {
                                        "source": "ctx._source.property.likes--; ctx._source.usersWhoLiked.remove(ctx._source.usersWhoLiked.indexOf(params.user));",
                                        "params":{
                                             "user" : currentUser
                                        }
                                   }
                              }
                         });
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
     },
     retweet: async(id, currentUser)=>{
          getItemResult = await module.exports.getItemById(id)
          debug.log("getitem res: " + JSON.stringify(getItemResult));
        
	  if(getItemResult && getItemResult.item){
            console.log("id in retweet: " + id); 
	    var response = await client.update({
                              index: index,
                              id:id,
                              body:{
                                   "script": {
                                        "source":"ctx._source.retweeted++;",
                                        "params":{
                                             "user" : currentUser
                                        }
                                   }
                              }
                         }).catch((err)=>{console.log(err)});;
				  console.log("end update");

          }
          else{
               //Item does not exist
               //Return error
          }
          return {}
     }
   }
