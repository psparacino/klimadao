import { urls } from "lib/constants";
import { fetcher } from "lib/fetcher";
import { getProjectsQueryString } from "lib/getProjectsQueryString";
import { Project } from "lib/types/carbonmark.types";
import { isNil } from "lodash";
import { negate } from "lodash/fp";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useSWR from "swr";

/** SWR hook that listens to the router for query param changes */
export const useFetchProjects = (network: "polygon" | "mumbai") => {
  const router = useRouter();
  const queryString = getProjectsQueryString(router.query);

  const [storedNetwork, setStoredNetwork] = useState(network);

  useEffect(() => {
    if (network && network !== storedNetwork) {
      setStoredNetwork(network);
    }
  }, [network, storedNetwork]);

  const swrKey = storedNetwork
    ? `${urls.api.projects}${queryString}${
        queryString ? "&" : "?"
      }network=${storedNetwork}`
    : null;

  const { data, ...rest } = useSWR<Project[]>(swrKey, fetcher, {
    revalidateOnMount: true,
  });
  /** Remove any null or undefined projects */
  const projects = data?.filter(negate(isNil)) ?? [];
  return { projects, ...rest };
};
