/*global PromisePool*/
//working config
const getConfig = {
  email: "douira100@gmail.com",
  listChunkSize: 40,
  concurrentItemGet: 5,
  recurseList: true, //set to false to only check one page of items
  display: true, //set to true to display projects as images and titles
  getSingleInfo: true //set to true to request all scratchpad infos individually
}

//project item template, filled if display enabled
let itemTemplate

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

    //if display enabled add these newly gotten items to the display
    if (getConfig.display) {
      //add all items to display
      $("#project-list").append(result.scratchpads.map(s => {
        //make clone of template
        const item = itemTemplate.clone()

        //set whole item as link
        item.attr("href", s.url)

        //set image and title attributes
        item.children(".project-thumb").attr("src", `https://www.khanacademy.org${s.thumb}`)
        item.children(".project-title").text(s.title)

        //return filled item to be added to display
        return item
      }))

      //set display title
      $("#project-amount").text(prevListItems.length)
      $("#author-name").text(prevListItems[0].authorNickname || "?")
    }

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

//gets the infor for all individual scratchpads
const getSingleInfo = items => {
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
    const detailedItems = poolResults.map(item => ({
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
    console.log(detailedItems)
    console.log(JSON.stringify(detailedItems))
  })
}

//when document is ready, start
$(document).ready(() => {
  //if enabled, make display of images
  if (getConfig.display) {
    //get template item and remove from dom and remove id
    itemTemplate = $("#project-item-template").detach().removeAttr("id")
  }

  //start retrieving scratchpad items
  getListChunk().then(items => {
    //if enbled, get information for every individual scratchpad
    if (getConfig.getSingleInfo) {
      getSingleInfo(items)
    }
  })
})
