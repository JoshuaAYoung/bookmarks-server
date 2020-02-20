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

function testMaliciousBookmark() {
  const maliciousBookmark = {
    id: 911,
    title: 'Bad script <script>alert("xss");</script>',
    url: 'https://www.nonsense.com',
    description: `bad img <img src="https://www.nonsense.floofer" onerror="alert(document.cookie);"> But not <strong>all</strong> bad.`,
    rating: 5
  }
  const expectedBookmark = {
    ...maliciousBookmark,
    title: 'Bad script &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    // this was not matching the expected, removed onerror="alert(document.cookie)
    description: `bad img <img src="https://www.nonsense.floofer"> But not <strong>all</strong> bad.`,
  }
  return {
    maliciousBookmark,
    expectedBookmark
  }
}

module.exports = {
  makeBookmarksArray,
  testMaliciousBookmark
}