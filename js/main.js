//working config
const getConfig = {
  email: "douira100@gmail.com",
  listChunkSize: 40,
  concurrentItemGet: 5
}

//gets a chunk of the list from the server
const getListChunk = (cursor, page = 0, prevListItems = []) => new Promise((resolve, reject) => {
  //build get url with params
  let url = `https://www.khanacademy.org/api/internal/user/scratchpads?casing=camel&email=${
    encodeURIComponent(getConfig.email)}&sort=2&page=${page}&limit=${
    getConfig.listChunkSize}&lang=en&subject=all&_=${Date.now()}`

  //if cursor given from last request, attach
  if (cursor) {
    url += `&cursor=${cursor}`
  }

  //do request to api with url
  $.get({
    url,
    dataType: "json"
  }).done(result => {
    //add all items to list
    prevListItems = prevListItems.concat(result.scratchpads)

    //check if there are still remaining items to be fetched
    if (result.complete) {
      //resolve now, nothing more to fetch
      resolve(prevListItems)
    } else {
      //recurse to get next chunk using incremented page, last given cursor and current item list
      //resolve this, when nested resolves
      getListChunk(result.cursor, page + 1, prevListItems).then(resolve)
    }
  }).fail(reject) //stop on get error
})

$(document).ready(() => {
  //start retrieving scratchpad items
  getListChunk()//.then(items => )
})
