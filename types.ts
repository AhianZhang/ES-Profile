
export interface ProfileNode {
  type: string;
  description: string;
  time_in_nanos: number;
  breakdown: Record<string, number>;
  children?: ProfileNode[];
}

export interface CollectorNode {
  name: string;
  reason: string;
  time_in_nanos: number;
  children?: CollectorNode[];
}

export interface SearchProfile {
  query: ProfileNode[];
  rewrite_time: number;
  collector: CollectorNode[];
}

export interface ShardProfile {
  id: string;
  searches: SearchProfile[];
  aggregations: ProfileNode[];
}

export interface ESProfileResponse {
  profile: {
    shards: ShardProfile[];
  };
}

export interface AnalysisResult {
  summary: string;
  bottlenecks: string[];
  recommendations: string[];
}
