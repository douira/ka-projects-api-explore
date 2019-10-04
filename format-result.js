const prettier = require("prettier");
const data = require("./result-list.json");
const fs = require("fs");

//format the result
data.forEach(entry => {
  try {
    entry.code = prettier.format(entry.code, {
      semi: true,
      tabWidth: 4,
      parser: "babel"
    });
  } catch (err) {}
});

//save the result
fs.writeFileSync("result-list-formatted.json", JSON.stringify(data, null, 2));
