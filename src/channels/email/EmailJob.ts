import { Job } from '../../queue'
import { User } from '../../users/User'
import { UserEvent } from '../../users/UserEvent'
import { EmailTemplate } from '../../render/Template'
import { createEvent } from '../../users/UserEventRepository'
import { MessageTrigger } from '../MessageTrigger'
import { loadChannel } from '../../config/channels'
import Campaign from '../../campaigns/Campaign'
import { updateSendState } from '../../campaigns/CampaignService'
import Project from '../../projects/Project'

export default class EmailJob extends Job {
    static $name = 'email'

    static from(data: MessageTrigger): EmailJob {
        return new this(data)
    }

    static async handler({ campaign_id, user_id, event_id }: MessageTrigger) {

        // Pull user & event details
        const user = await User.find(user_id)
        const event = await UserEvent.find(event_id)
        const campaign = await Campaign.find(campaign_id)
        const project = await Project.find(campaign?.project_id)

        // If user or campaign has been deleted since, abort
        if (!user || !campaign || !project) return

        const template = await EmailTemplate.first(
            qb => qb.where('campaign_id', campaign.id).where('locale', user.locale),
        )

        // TODO: This is bad, need a fallback template for sending
        // If not available template, abort
        if (!template) return

        const context = {
            campaign_id: campaign?.id,
            template_id: template?.id,
        }

        // TODO: Use the providers attached to the campaign

        // Send and render email
        const channel = await loadChannel(user.project_id, 'email')
        await channel.send(template, { user, event, context })

        // Update send record
        await updateSendState(campaign, user)

        // Create an event on the user about the email
        await createEvent({
            project_id: user.project_id,
            user_id: user.id,
            name: 'email_sent',
            data: context,
        })
    }
}
