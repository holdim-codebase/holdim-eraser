
import fastifyFactory from 'fastify'
import { config } from './config'
import { logger } from './logging'
import { queuePrpoposals } from './services/pubsub'
import { getProposals } from './services/snapshot'

export const fastify = fastifyFactory({ logger })

fastify.post('/', async (request, reply) => {
  try {
    console.log(request.body)
    return await reply.status(200).send({})
  } catch (error) {
    logger.error(error)
    return reply.status(400).send({ message: (typeof error === 'object' && (error as { message?: string } || null)?.message) ?? 'unknown' })
  }
})

export const server = fastify
