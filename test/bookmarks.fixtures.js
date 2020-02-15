function makeBookmarksArray() {
  return [
    {
      id: 1,
      title: 'google',
      url: 'google.com',
      description: 'google search engine',
      rating: 4.2
    },
    {
      id: 2,
      title: 'duckduckgo',
      url: 'duckduckgo.com',
      description: 'duckduckgo search engine',
      rating: 5
    },
    {
      id: 3,
      title: 'yahoo',
      url: 'yahoo.com',
      description: 'yahoo search engine',
      rating: 3
    },
  ]
}

module.exports = {
  makeBookmarksArray,
}