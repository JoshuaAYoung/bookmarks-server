// require('dotenv').config();
const express = require('express');
const uuid = require('uuid/v4');
const logger = require('../logger');
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const BookmarksService = require('../bookmarks-service.js')

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks)
      })
      .catch(next)
  })
// .post(bodyParser, (req, res) => {
//   const { title, url, description, rating } = req.body;

//   if (!title) {
//     logger.error(`Title is required`);
//     return res
//       .status(400)
//       .send('Title is required');
//   }

//   if (!url) {
//     logger.error(`URL is required`);
//     return res
//       .status(400)
//       .send('URL is required');
//   }

//   if (!description) {
//     logger.error(`Description is required`);
//     return res
//       .status(400)
//       .send('Description is required');
//   }

//   if (!rating) {
//     logger.error(`Rating is required`);
//     return res
//       .status(400)
//       .send('Rating is required');
//   }

//   const parsedRating = parseInt(rating);

//   if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
//     logger.error(`Invalid rating of ${rating} was supplied`);
//     return res
//       .status(400)
//       .send('Rating needs to be a number between 1 and 5');
//   }

//   const id = uuid();

//   const bookmark = {
//     id,
//     title,
//     url,
//     description,
//     rating: parsedRating
//   }

//   bookmarks.push(bookmark);

//   logger.info(`Bookmark with id ${id} created`);

//   res
//     .status(201)
//     .location(`http://localhost:8000/bookmarks/${id}`)
//     .json(bookmark);
// });

bookmarksRouter
  .route('/bookmarks/:id')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${id} not found.`);
          return res.status(404).json({
            error: { message: `Article doesn't exist` }
          })
        }
        res.json(bookmark)
      })
      .catch(next)
  })
// .delete((req, res) => {
//   const { id } = req.params;

//   const bookmarkIndex = bookmarks.findIndex((b) => b.id == id);

//   if (bookmarkIndex === -1) {
//     logger.error(`Bookmark with id ${id} not found.`);
//     return res.status(404).send('Not found');
//   }

//   bookmarks.splice(bookmarkIndex, 1);

//   logger.info(`Bookmark with id ${id} deleted.`);

//   res.status(204).end();
// });

module.exports = bookmarksRouter;