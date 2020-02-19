// require('dotenv').config();
const express = require('express');
// const uuid = require('uuid/v4');
const logger = require('../logger');
const bodyParser = express.json();
const bookmarksRouter = express.Router();
const xss = require('xss');
const BookmarksService = require('../bookmarks-service.js')

const scrubBookmark = bookmark => ({
  id: bookmark.id,
  title: xss(bookmark.title),
  url: xss(bookmark.url),
  description: xss(bookmark.description),
  rating: bookmark.rating,
})

bookmarksRouter
  .route('/bookmarks')
  .get((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getAllBookmarks(knexInstance)
      .then(bookmarks => {
        res.json(bookmarks.map(scrubBookmark))
      })
      .catch(next)
  })
  .post(bodyParser, (req, res, next) => {
    const { title, url, description, rating } = req.body;

    if (!title) {
      logger.error(`Title is required`);
      return res
        .status(400)
        .send('Missing title in request body');
    }

    if (!url) {
      logger.error(`URL is required`);
      return res
        .status(400)
        .send('Missing url in request body');
    }

    if (!rating) {
      logger.error(`Rating is required`);
      return res
        .status(400)
        .send('Missing rating in request body');
    }

    const parsedRating = parseInt(rating);

    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      logger.error(`Invalid rating of ${rating} was supplied`);
      return res
        .status(400)
        .send('Rating needs to be a number between 1 and 5');
    }
    const newBookmark = {
      title,
      url,
      description,
      rating: parsedRating
    }

    BookmarksService.insertBookmark(
      req.app.get('db'),
      newBookmark
    )
      .then(bookmark => {
        res
          .status(201)
          .location(`/bookmarks/${bookmark.id}`)
          .json(scrubBookmark(bookmark))
      })
      .catch(next)
  })

bookmarksRouter
  .route('/bookmarks/:id')
  .all((req, res, next) => {
    const knexInstance = req.app.get('db')
    BookmarksService.getById(knexInstance, req.params.id)
      .then(bookmark => {
        if (!bookmark) {
          logger.error(`Bookmark with id ${req.params.id} not found.`);
          return res.status(404).json({
            error: { message: `Bookmark doesn't exist` }
          })
        }
        res.bookmark = bookmark
        next()
      })
      .catch(next)
  })
  .get((req, res, next) => {
    res.json(bookmarks.map(scrubBookmark))
  })
  .delete((req, res, next) => {
    BookmarksService.deleteBookmark(
      req.app.get('db'),
      req.params.id
    )
      .then(numRowsAffected => {
        logger.info(`Bookmark with id ${req.params.id} deleted.`)
        res.status(204).end()
      })
      .catch(next)
  })


module.exports = bookmarksRouter;