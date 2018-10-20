/*global PromisePool*/
//working config
const getConfig = {
  email: "douira100@gmail.com",
  listChunkSize: 40,
  concurrentItemGet: 5,
  recurseList: true //set to false to only check one page
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
    if (! getConfig.recurseList || result.complete) {
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
  getListChunk().then(items => {
    //index of generating promises of items
    let itemIndex = 0

    //array of resolve values as promise pool doesn't collect them
    const poolResults = []

    //create pool for get promises
    new PromisePool(() => {
      //return null to stop if no items left
      if (itemIndex === items.length) {
        return null
      }

      //save current index amd increment for next
      const index = itemIndex ++

      //get current item, parse id string from url part
      const itemId = items[index].url.split("/").pop()

      //return promise to get info of that item
      return new Promise((resolve, reject) => {
        $.get({
          url: `https://www.khanacademy.org/api/internal/show_scratchpad?scratchpad_id=${
            itemId}&casing=camel&topic_slug=computer-programming&lang=en`,
          dataType: "json"
        }).done(result => {
          //save result with index
          poolResults[index] = result

          //and resolve on done
          resolve()
        }).fail(reject)
      })
    }, getConfig.concurrentItemGet)

    //and start pool and then use returned values
    .start().then(() => {
      //create the list info array by mapping from all the data gotten for the items
      const items = poolResults.map(item => ({
        code: item.scratchpad.revision.code,
        width: item.scratchpad.width,
        height: item.scratchpad.height,
        revId: item.scratchpad.revision.id,
        itemId: item.scratchpad.id,
        imageUrl: item.scratchpad.imageUrl,
        url: item.scratchpad.url,
        title: item.scratchpad.title,
        created: item.scratchpad.created,
        basedOnId: item.scratchpad.originScratchpadId
      }))

      //make available
      console.log(items)
      console.log(JSON.stringify(items))
    })
  })
})
