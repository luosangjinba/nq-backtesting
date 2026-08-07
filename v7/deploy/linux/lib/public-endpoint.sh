#!/usr/bin/env bash

# Bounded public-endpoint and DNS discovery for the unified deploy orchestrator.

replay_lab_valid_ipv4() {
  local value="$1"
  local parts=()
  local part=""
  IFS=. read -r -a parts <<< "$value"
  [[ "${#parts[@]}" -eq 4 ]] || return 1
  for part in "${parts[@]}"; do
    [[ "$part" =~ ^[0-9]{1,3}$ ]] || return 1
    (( 10#$part <= 255 )) || return 1
  done
}

replay_lab_public_ipv4() {
  local value="$1"
  local first=""
  local second=""
  replay_lab_valid_ipv4 "$value" || return 1
  IFS=. read -r first second _ <<< "$value"
  first=$((10#$first))
  second=$((10#$second))
  (( first > 0 && first < 224 )) || return 1
  (( first != 10 && first != 127 )) || return 1
  (( first != 169 || second != 254 )) || return 1
  (( first != 172 || second < 16 || second > 31 )) || return 1
  (( first != 192 || second != 168 )) || return 1
  (( first != 100 || second < 64 || second > 127 )) || return 1
  (( first != 198 || (second != 18 && second != 19) )) || return 1
}

replay_lab_clean_ipv4() {
  local candidate="$1"
  candidate="$(printf '%s' "$candidate" | tr -d '[:space:]')"
  replay_lab_public_ipv4 "$candidate" || return 1
  printf '%s' "$candidate"
}

replay_lab_curl() {
  local curl_bin="${REPLAY_LAB_CURL_BIN:-curl}"
  "$curl_bin" --noproxy '*' --silent --show-error --fail --max-time "$@"
}

replay_lab_alibaba_public_ipv4() {
  local token=""
  local candidate=""
  token="$(replay_lab_curl 2 -X PUT \
    -H 'X-aliyun-ecs-metadata-token-ttl-seconds:60' \
    http://100.100.100.200/latest/api/token 2>/dev/null || true)"
  [[ -n "$token" ]] || return 1
  for metadata_key in eipv4 public-ipv4; do
    candidate="$(replay_lab_curl 2 \
      -H "X-aliyun-ecs-metadata-token: $token" \
      "http://100.100.100.200/latest/meta-data/$metadata_key" 2>/dev/null || true)"
    replay_lab_clean_ipv4 "$candidate" && return 0
  done
  return 1
}

replay_lab_digitalocean_public_ipv4() {
  local candidate=""
  candidate="$(replay_lab_curl 2 \
    http://169.254.169.254/metadata/v1/interfaces/public/0/ipv4/address \
    2>/dev/null || true)"
  replay_lab_clean_ipv4 "$candidate"
}

replay_lab_external_public_ipv4() {
  local candidate=""
  local endpoint=""
  for endpoint in https://api.ipify.org https://checkip.amazonaws.com; do
    candidate="$(replay_lab_curl 4 "$endpoint" 2>/dev/null || true)"
    if replay_lab_clean_ipv4 "$candidate"; then
      return 0
    fi
  done
  return 1
}

replay_lab_detect_public_ipv4() {
  local candidate=""
  if candidate="$(replay_lab_alibaba_public_ipv4)"; then
    printf '%s\talibaba-ecs-metadata' "$candidate"
    return 0
  fi
  if candidate="$(replay_lab_digitalocean_public_ipv4)"; then
    printf '%s\tdigitalocean-metadata' "$candidate"
    return 0
  fi
  if candidate="$(replay_lab_external_public_ipv4)"; then
    printf '%s\texternal-address-observer' "$candidate"
    return 0
  fi
  return 1
}

replay_lab_domain_ipv4s() {
  local domain="$1"
  getent ahostsv4 "$domain" 2>/dev/null \
    | awk '$2 == "STREAM" { print $1 }' \
    | sort -u
}
