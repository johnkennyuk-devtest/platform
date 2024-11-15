import { Job } from '../queue'
import { DynamicList } from './List'
import { getList, populateList } from './ListService'
import ListStatsJob from './ListStatsJob'

interface ListPopulateParams {
    listId: number
    projectId: number
}

export default class ListPopulateJob extends Job {
    static $name = 'list_populate_job'

    static from(listId: number, projectId: number): ListPopulateJob {
        return new this({ listId, projectId })
    }

    static async handler({ listId, projectId }: ListPopulateParams) {

        const list = await getList(listId, projectId) as DynamicList
        if (!list) return

        await populateList(list)

        await ListStatsJob.from(listId, projectId, true).queue()
    }
}
