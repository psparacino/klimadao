import { useWeb3 } from "@klimadao/lib/utils";
import { urls } from "lib/constants";
import { fetcher } from "lib/fetcher";
import { getProjectsQueryString } from "lib/getProjectsQueryString";
import { Project } from "lib/types/carbonmark.types";
import { isNil } from "lodash";
import { negate } from "lodash/fp";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";

export const useFetchProjects = () => {
  const router = useRouter();
  const queryString = getProjectsQueryString(router.query);
  const { networkLabel } = useWeb3();

  const [currentNetwork, setCurrentNetwork] = useState(networkLabel);

  useEffect(() => {
    if (networkLabel && networkLabel !== currentNetwork) {
      setCurrentNetwork(networkLabel);
      const path = `${urls.api.projects}${queryString}${
        queryString ? "&" : "?"
      }network=${networkLabel}`;
      mutate(path);
    }
  }, [networkLabel, queryString]);

  const path = currentNetwork
    ? `${urls.api.projects}${queryString}${
        queryString ? "&" : "?"
      }network=${currentNetwork}`
    : null;

  const { data, ...rest } = useSWR<Project[]>(path, fetcher, {
    revalidateOnMount: true,
  });

  const projects = data?.filter(negate(isNil)) ?? [];
  return { projects, ...rest };
};
