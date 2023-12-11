import { utils } from "ethers";
import { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { isNil } from "lodash";
import {
  fetchCarbonProject,
  type FetchCarbonProjectArgs,
  type FetchCarbonProjectMethod,
} from "../../../../src/utils/helpers/carbonProjects.utils";
import { REGISTRIES } from "../../../app.constants";
import { Purchase } from "../../../models/Purchase.model";
import { CreditId } from "../../../utils/CreditId";
import { gql_sdk } from "../../../utils/gqlSdk";
import { ICR_API } from "./../../../../src/utils/ICR/ICR_API_endpoints";
import { Params, Querystring, schema } from "./get.schema";
import { isValidPurchaseId } from "./get.utils";

const handler = async (
  request: FastifyRequest<{
    Params: Params;
    Querystring: Querystring;
  }>,
  reply: FastifyReply
) => {
  if (!isValidPurchaseId(request.params.id)) {
    return reply.badRequest("Invalid purchase id: " + request.params.id);
  }
  const network = request.query.network ?? "polygon";

  const sdk = gql_sdk(network);

  const { purchase } = await sdk.marketplace.getPurchaseById(request.params);
  /** Handle the not found case */
  if (isNil(purchase)) {
    return reply.status(404).send({ error: "Purchase not found" });
  }

  const [standard, registryProjectId] = CreditId.splitProjectId(
    purchase.listing.project.key
  );
  let fetchCarbonProjectMethod: FetchCarbonProjectMethod;
  let fetchCarbonProjectArgs: FetchCarbonProjectArgs;

  switch (standard) {
    case REGISTRIES["ICR"].id: {
      const { ICR_API_URL } = ICR_API(network);
      fetchCarbonProjectMethod = ICR_API_URL;
      fetchCarbonProjectArgs = {
        // use tokenAddress in place of the serialization for purchases
        contractAddress: purchase.listing.tokenAddress,

        network: network,
      };
      break;
    }
    default:
      fetchCarbonProjectMethod = sdk;
      fetchCarbonProjectArgs = {
        registry: standard,
        registryProjectId,
        network: network,
      };
      break;
  }
  const project = await fetchCarbonProject(
    fetchCarbonProjectMethod,
    fetchCarbonProjectArgs
  );
  const amount = purchase.listing.project.key.startsWith("ICR")
    ? purchase.amount
    : utils.formatUnits(purchase.amount, 18);

  const response: Purchase = {
    id: purchase.id,
    amount: amount,
    price: utils.formatUnits(purchase.price, 6),
    listing: {
      id: purchase.listing.id,
      tokenAddress: purchase.listing.tokenAddress,
      seller: {
        id: purchase.listing.seller.id,
      },
      project: {
        key: purchase.listing.project.key,
        vintage: purchase.listing.project.vintage,
        methodology: project?.methodologies?.[0]?.id ?? "",
        name: project?.name ?? "",
        projectID: registryProjectId,
        country: project?.country ?? "",
      },
    },
  };

  return reply.status(200).send(response);
};

export default (fastify: FastifyInstance) =>
  fastify.route({
    method: "GET",
    url: "/purchases/:id",
    handler,
    schema,
  });
