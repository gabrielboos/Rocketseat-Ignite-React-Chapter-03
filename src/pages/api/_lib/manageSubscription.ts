import { fauna } from "../../../services/fauna";
import { query as q, Ref } from 'faunadb';
import { stripe } from "../../../services/stripe";

export async function saveSubscription(
    subscriptionId: string,
    customerId: string,
    createAction = false
) {

    console.log(`saving for created = ${createAction}`);

    try {
        const userRef = await fauna.query<string>(
            q.Select(
                "ref",
                q.Get(
                    q.Match(
                        q.Index('user_by_stripe_costumer_id'),
                        customerId
                    ),
                )
            )
        );

        const subscription = await stripe.subscriptions.retrieve(subscriptionId);

        const subscriptionData = {
            id: subscription.id,
            userId: userRef,
            status: subscription.status,
            price_id: subscription.items.data[0].price.id,
        }

        if (createAction) {
            await fauna.query(
                q.If(
                    q.Not(
                        q.Exists(
                            q.Match(
                                q.Index('subscription_by_id'),
                                q.Casefold(subscriptionId)
                            )
                        )
                    ),
                    q.Create(
                        q.Collection('subscriptions'),
                        { data: subscriptionData }
                    ),
                    q.Get(
                        q.Match(
                            q.Index('subscription_by_id'),
                            q.Casefold(subscriptionId)
                        )
                    )
                )
            );
        } else {
            await fauna.query(
                q.Replace(
                    q.Select(
                        "ref",
                        q.Get(
                            q.Match(
                                q.Index('subscription_by_id'),
                                subscriptionId
                            )
                        )
                    ),
                    { data: subscriptionData }
                )
            );
        }
        console.log(`completed`);
    } catch (err) {
        console.log(err.message);
    }

}