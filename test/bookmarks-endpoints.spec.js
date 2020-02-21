require('dotenv').config()
const { expect } = require('chai')
const knex = require('knex')
const app = require('../src/app')
const { makeBookmarksArray, testMaliciousBookmark } = require('./bookmarks.fixtures')

describe('Bookmarks Endpoints', function () {
  let db

  before('make knex instance', () => {
    db = knex({
      client: 'pg',
      connection: process.env.TEST_DB_URL,
    })
    app.set('db', db)
  })

  after('disconect from db', () => db.destroy())

  before('clean the table', () => db('bookmarks').truncate())

  afterEach('cleanup', () => db('bookmarks').truncate())

  describe(`GET /api/bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [])
      })
    })

    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 200 and all of the bookmarks', () => {
        return supertest(app)
          .get('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testBookmarks)
      })
    })

    context('Given an XSS attack article', () => {
      const { maliciousBookmark, expectedBookmark } = testMaliciousBookmark()

      beforeEach('insert malicious bookmark', () => {
        return db
          .into('bookmarks')
          .insert([maliciousBookmark])
      })
      it('removes XSS attack content', () => {
        return supertest(app)
          .get(`/api/bookmarks`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(200)
          .expect(res => {
            expect(res.body[0].title).to.eql(expectedBookmark.title)
            expect(res.body[0].description).to.eql(expectedBookmark.description)
          })
      })
    })
  })
  describe(`POST /api/bookmarks`, () => {
    it(`creates a bookmark, responding with 201 and the new bookmark`, function () {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 4
      }
      // added for use in camparing the post with the get
      let resBody;

      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(201)
        .expect(res => {
          // declares the variable
          resBody = res.body;
          expect(res.body.title).to.eql(newBookmark.title)
          expect(res.body.url).to.eql(newBookmark.url)
          expect(res.body.description).to.eql(newBookmark.description)
          expect(res.body.rating).to.eql(newBookmark.rating)
          expect(res.body).to.have.property('id')
          expect(res.headers.location).to.eql(`/api/bookmarks/${res.body.id}`)
        })
        .then(res =>
          supertest(app)
            .get(`/api/bookmarks/${resBody.id}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            // compares the res with resBody for a match
            .expect(200, resBody)
        )
    })

    it('removes XSS attack content from response', () => {
      const { maliciousBookmark, expectedBookmark } = testMaliciousBookmark()

      return supertest(app)
        .post(`/api/bookmarks`)
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(maliciousBookmark)
        .expect(201)
        .expect(res => {
          expect(res.body.title).to.eql(expectedBookmark.title)
          expect(res.body.description).to.eql(expectedBookmark.description)
        })
    })

    const requiredFields = ['title', 'url', 'rating']

    requiredFields.forEach(field => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        rating: '4'
      }

      it(`responds with 400 and an error message when the ${field} is missing`, () => {
        delete newBookmark[field]

        return supertest(app)
          .post('/api/bookmarks')
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(newBookmark)
          .expect(400, `Missing ${field} in request body`
          )
      })
    })

    it('responds with 400 and an error message when rating is not a number', () => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 'four'
      }

      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(400, 'Rating needs to be a number between 1 and 5')
    })

    it('responds with 400 and an error message when rating is a number over 5', () => {
      const newBookmark = {
        title: 'Test new bookmark',
        url: 'www.ham.com',
        description: 'this is a test bookmark',
        rating: 7
      }

      return supertest(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
        .send(newBookmark)
        .expect(400, 'Rating needs to be a number between 1 and 5')
    })
  })

  describe('Delete /api/bookmarks/:id', () => {
    context(`Given no bookmarks`, () => {
      it(`responds 404 when bookmark does not exist`, () => {
        return supertest(app)
          .delete(`/api/bookmarks/123`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: `Bookmark doesn't exist` }
          })
      })

      context(`Given bookmarks are in the database`, () => {
        const testBookmarks = makeBookmarksArray()

        beforeEach('insert bookmarks', () => {
          return db
            .into('bookmarks')
            .insert(testBookmarks)
        })

        it(`deletes the bookmark by ID`, () => {
          const testBookmarks = makeBookmarksArray()
          // gets id and takes bookmark out with matching id
          const deleteID = testBookmarks[0].id
          return supertest(app)
            .delete(`/api/bookmarks/${deleteID}`)
            .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
            .expect(204)
            .then(() =>
              supertest(app)
                // fixed the get request to have actual id
                .get(`/api/bookmarks/${deleteID}`)
                .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
                // expects 404 becuse nothing there !!
                .expect(404)
            )
        })
      })
    })
  })
  describe(`PATCH /api/bookmarks/:bookmarks`, () => {
    context(`Given no bookmarks`, () => {
      it(`responds with 404`, () => {
        const bookmarkId = 123456
        return supertest(app)
          .patch(`/api/bookmarks/${bookmarkId}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: `Bookmark doesn't exist` } })
      })
    })
    context('Given there are bookmarks in the database', () => {
      const testBookmarks = makeBookmarksArray()

      beforeEach('insert bookmarks', () => {
        return db
          .into('bookmarks')
          .insert(testBookmarks)
      })

      it('responds with 204 and updates the bookmark', () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark Title',
          url: 'www.ham.com',
          description: 'updated bookmark Description',
          rating: 3.7
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send(updateBookmark)
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      })

      it(`responds with 400 when no required fields supplied`, () => {
        const idToUpdate = 2
        return supertest(app)
          .patch(`/api/bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({ irrelevantField: 'foo' })
          .expect(400, {
            error: {
              message: `Request body must contain either 'title', 'url', 'description' or 'rating'`
            }
          })
      })

      it(`responds with 204 when updating only a subset of fields`, () => {
        const idToUpdate = 2
        const updateBookmark = {
          title: 'updated bookmark Title'
        }
        const expectedBookmark = {
          ...testBookmarks[idToUpdate - 1],
          ...updateBookmark
        }
        return supertest(app)
          .patch(`/api/Bookmarks/${idToUpdate}`)
          .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
          .send({
            ...updateBookmark,
            fieldToIgnore: 'should not be in GET response'
          })
          .expect(204)
          .then(res =>
            supertest(app)
              .get(`/api/Bookmarks/${idToUpdate}`)
              .set('Authorization', `Bearer ${process.env.API_TOKEN}`)
              .expect(expectedBookmark)
          )
      })
    })
  })
})
