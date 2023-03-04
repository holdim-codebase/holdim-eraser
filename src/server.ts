import fastifyFactory from 'fastify'
import axios from 'axios'
import { repositories } from './repositories'
import { logger } from './logging'

export const fastify = fastifyFactory({ logger })

const SEC_IN_MS = 1e3
const MIN_IN_MS = SEC_IN_MS * 60
const HOUR_IN_MS = MIN_IN_MS * 60
const DAY_IN_MS = HOUR_IN_MS * 24

const SNAPSHOT_BASE_URL = 'https://hub.snapshot.org/graphql'

const removeDeletedProposals = async (from: Date) => {
  const proposals = await repositories.proposal.findMany({
    where: {
      createdAt: { gte: from },
    },
  })

  const totalProposals = proposals.length
  logger.info(`Found ${totalProposals} proposals created from ${from.toUTCString()}`)

  let currentProposalIndex = 0
  for (const proposal of proposals) {
    currentProposalIndex++
    logger.info(`Processing ${(currentProposalIndex / totalProposals * 100).toFixed()}%`)
    try {
      // Time delay is set to avoid HTTP 429 status from snapshot server
      await new Promise(resolve => setTimeout(resolve, 200))

      const { data } = await axios.post(SNAPSHOT_BASE_URL, {
        operationName: 'Proposal',
        variables: { id: proposal.snapshotId },
        query: 'query Proposal($id: String!) {\n  proposal(id: $id) {id}}',
      })

      if (!data || !data.data || !data.data.proposal) {
        logger.warn('NEEDS DELETION', {
          data,
          id: proposal.id,
        })
        await repositories.proposal.delete({ where: { id: proposal.id } })
        logger.info('DELETED')
      }
    } catch (error) {
      console.log(`error: ${(error as Error).message}, proposal: ${JSON.stringify(proposal.id)}`)
    }
  }
}

fastify.post('/', async (request, reply) => {
  try {
    await removeDeletedProposals(new Date(Date.now() - DAY_IN_MS))

    return await reply.status(200).send({})
  } catch (error) {
    logger.error(error)
    return reply.status(400).send({ message: (typeof error === 'object' && (error as { message?: string } || null)?.message) ?? 'unknown' })
  }
})

export const server = fastify
