#!/usr/bin/env python3
"""
计算一段行情的 K 线顺畅度评分。

用法:
    python3 smoothness_calculator.py --db trading_data.duckdb --table futures_1m \
        --start "2012-01-10 09:30:00" --end "2012-01-10 10:15:00"
"""

import argparse
import duckdb
import math
import sys


def fetch_bars(db_path, table, start_time, end_time):
    """获取指定时间段的 K 线数据"""
    conn = duckdb.connect(db_path, read_only=True)
    query = f"""
        SELECT ts, open, high, low, close
        FROM {table}
        WHERE ts >= '{start_time}' AND ts <= '{end_time}'
        ORDER BY ts
    """
    result = conn.execute(query).fetchall()
    conn.close()
    return result


def calc_direction_consistency(bars):
    """方向一致性：同方向K线数 / 总K线数"""
    if len(bars) < 2:
        return 0.5

    directions = []
    for bar in bars:
        o, c = bar[1], bar[4]
        if c > o:
            directions.append(1)  # bullish
        elif c < o:
            directions.append(-1)  # bearish
        else:
            directions.append(0)  # neutral

    # 计算主导方向
    bullish_count = sum(1 for d in directions if d > 0)
    bearish_count = sum(1 for d in directions if d < 0)

    if bullish_count >= bearish_count:
        dominant = 1
        dominant_count = bullish_count
    else:
        dominant = -1
        dominant_count = bearish_count

    consistency = dominant_count / len(bars)
    return consistency


def calc_body_ratio(bars):
    """实体占比：平均实体大小 / 平均K线范围"""
    if len(bars) < 1:
        return 0.5

    body_sizes = []
    bar_ranges = []

    for bar in bars:
        o, h, l, c = bar[1], bar[2], bar[3], bar[4]
        body = abs(c - o)
        range_ = h - l
        body_sizes.append(body)
        bar_ranges.append(range_)

    avg_body = sum(body_sizes) / len(body_sizes)
    avg_range = sum(bar_ranges) / len(bar_ranges)

    if avg_range == 0:
        return 0.5

    ratio = avg_body / avg_range
    return min(ratio, 1.0)  # cap at 1.0


def calc_continuity(bars):
    """连续性：最大连续同方向K线数 / 总K线数"""
    if len(bars) < 2:
        return 0.5

    directions = []
    for bar in bars:
        o, c = bar[1], bar[4]
        if c > o:
            directions.append(1)
        elif c < o:
            directions.append(-1)
        else:
            directions.append(0)

    # 找最大连续同方向
    max_consecutive = 1
    current_consecutive = 1
    current_direction = directions[0] if directions else 0

    for d in directions[1:]:
        if d == current_direction and d != 0:
            current_consecutive += 1
            max_consecutive = max(max_consecutive, current_consecutive)
        else:
            current_consecutive = 1
            current_direction = d

    continuity = max_consecutive / len(bars)
    return continuity


def calc_efficiency(bars):
    """推进效率：净推进 / 总价格变化"""
    if len(bars) < 2:
        return 0.5

    # 净推进（终点 - 起点）
    start_price = bars[0][1]  # 第一根开盘价
    end_price = bars[-1][4]   # 最后一根收盘价
    net_move = abs(end_price - start_price)

    # 总价格变化（每根K线的价格移动总和）
    total_move = 0
    for bar in bars:
        o, h, l, c = bar[1], bar[2], bar[3], bar[4]
        # 使用 high-low 作为每根K线的价格活动范围
        total_move += (h - l)

    if total_move == 0:
        return 0.5

    efficiency = net_move / total_move
    return min(efficiency, 1.0)


def calc_slope_stability(bars):
    """斜率稳定性：斜率变化的一致程度"""
    if len(bars) < 3:
        return 0.5

    # 计算每根K线的"斜率"（价格变化方向和幅度）
    slopes = []
    for bar in bars:
        o, c = bar[1], bar[4]
        slope = c - o  # 正为上涨，负为下跌
        slopes.append(slope)

    # 计算斜率的标准差和均值
    mean_slope = sum(slopes) / len(slopes)

    if mean_slope == 0:
        # 如果平均斜率为0，用绝对值均值
        mean_abs_slope = sum(abs(s) for s in slopes) / len(slopes)
        if mean_abs_slope == 0:
            return 0.5
        # 用方向一致性替代
        return calc_direction_consistency(bars)

    variance = sum((s - mean_slope) ** 2 for s in slopes) / len(slopes)
    std_slope = math.sqrt(variance)

    # 稳定性 = 1 - 相对波动
    abs_mean = abs(mean_slope)
    if abs_mean == 0:
        return 0.5

    relative_std = std_slope / abs_mean
    stability = 1 - min(relative_std, 1.0)

    return stability


def calc_smoothness(bars):
    """综合顺畅度评分 (1-5)"""
    if len(bars) < 2:
        return 2.5  # 数据不足，返回中间值

    # 各指标权重
    weights = {
        'direction': 0.30,
        'body': 0.25,
        'continuity': 0.20,
        'efficiency': 0.15,
        'slope': 0.10
    }

    # 计算各指标
    direction = calc_direction_consistency(bars)
    body = calc_body_ratio(bars)
    continuity = calc_continuity(bars)
    efficiency = calc_efficiency(bars)
    slope = calc_slope_stability(bars)

    # 加权求和，映射到 1-5
    raw_score = (
        weights['direction'] * direction +
        weights['body'] * body +
        weights['continuity'] * continuity +
        weights['efficiency'] * efficiency +
        weights['slope'] * slope
    )

    # 映射到 1-5（raw_score 在 0-1 之间）
    smoothness = 1 + raw_score * 4

    return smoothness, {
        'direction_consistency': round(direction, 3),
        'body_ratio': round(body, 3),
        'continuity': round(continuity, 3),
        'efficiency': round(efficiency, 3),
        'slope_stability': round(slope, 3),
        'bar_count': len(bars)
    }


def main():
    parser = argparse.ArgumentParser(description='计算K线顺畅度评分')
    parser.add_argument('--db', required=True, help='DuckDB 数据库路径')
    parser.add_argument('--table', default='futures_1m', help='K线表名')
    parser.add_argument('--start', required=True, help='起始时间 YYYY-MM-DD HH:MM:SS')
    parser.add_argument('--end', required=True, help='结束时间 YYYY-MM-DD HH:MM:SS')

    args = parser.parse_args()

    bars = fetch_bars(args.db, args.table, args.start, args.end)

    if not bars:
        print(f"错误：未找到数据 ({args.start} ~ {args.end})")
        sys.exit(1)

    smoothness, details = calc_smoothness(bars)

    print(f"\n时间段: {args.start} ~ {args.end}")
    print(f"K线数量: {details['bar_count']}")
    print(f"\n各指标:")
    print(f"  方向一致性: {details['direction_consistency']}")
    print(f"  实体占比:   {details['body_ratio']}")
    print(f"  连续性:     {details['continuity']}")
    print(f"  推进效率:   {details['efficiency']}")
    print(f"  斜率稳定性: {details['slope_stability']}")
    print(f"\n综合顺畅度评分: {round(smoothness, 2)} (1-5)")
    print(f"  5 = 非常顺畅")
    print(f"  4 = 顺畅")
    print(f"  3 = 一般")
    print(f"  2 = 犹豫")
    print(f"  1 = 非常犹豫")


if __name__ == '__main__':
    main()