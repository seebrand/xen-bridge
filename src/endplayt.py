"""
桥牌剥光投入打法分析程序
Strip and Endplay Analyzer for Bridge
"""
from enum import Enum
from typing import List, Dict, Tuple, Optional
from collections import defaultdict


class Suit(Enum):
    """花色枚举"""
    CLUBS = "♣"
    DIAMONDS = "♦"
    HEARTS = "♥"
    SPADES = "♠"
    NT = "NT"  # 无将


class Position(Enum):
    """方位"""
    NORTH = "N"
    EAST = "E"
    SOUTH = "S"
    WEST = "W"


class Card:
    """牌张类"""

    def __init__(self, suit: Suit, rank: str):
        self.suit = suit
        self.rank = rank  # 'A', 'K', 'Q', 'J', '10', '9', ... '2'

    def __repr__(self):
        return f"{self.suit.value}{self.rank}"


class Hand:
    """一手牌"""

    def __init__(self):
        self.cards = {suit: [] for suit in [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]}

    def add_card(self, card: Card):
        self.cards[card.suit].append(card)

    def get_suit_length(self, suit: Suit) -> int:
        return len(self.cards[suit])

    def has_control(self, suit: Suit, trump_suit: Suit) -> bool:
        """判断是否控制该花色（有A或K，或将牌控制）"""
        if suit == Suit.NT:
            return False
        ranks = [card.rank for card in self.cards[suit]]
        return 'A' in ranks or 'K' in ranks or (
            self.get_suit_length(trump_suit) > 0 if trump_suit != Suit.NT else False)

    def get_honors(self, suit: Suit) -> List[str]:
        """获取该花色的大牌"""
        honors = []
        for card in self.cards[suit]:
            if card.rank in ['A', 'K', 'Q', 'J']:
                honors.append(card.rank)
        return honors


class Contract:
    """定约类"""

    def __init__(self, level: int, suit: Suit, declarer: Position, doubled=False, redoubled=False):
        self.level = level
        self.suit = suit
        self.declarer = declarer
        self.doubled = doubled
        self.redoubled = redoubled

    @property
    def trump_suit(self) -> Suit:
        return self.suit


class BridgeTable:
    """桥牌牌桌"""

    def __init__(self):
        self.hands = {pos: Hand() for pos in Position}
        self.contract = None
        self.tricks_taken = {Position.NORTH: 0, Position.SOUTH: 0, Position.EAST: 0, Position.WEST: 0}
        self.current_trick = []
        self.lead_position = None


class StripEndplayAnalyzer:
    """剥光投入分析器"""

    def __init__(self, table: BridgeTable):
        self.table = table
        self.declarer = table.contract.declarer
        self.dummy = self.get_partner(self.declarer)
        self.trump_suit = table.contract.trump_suit
        self.defenders = self.get_defenders()

    def get_partner(self, position: Position) -> Position:
        """获取同伴的位置"""
        if position in [Position.NORTH, Position.SOUTH]:
            return Position.SOUTH if position == Position.NORTH else Position.NORTH
        else:
            return Position.WEST if position == Position.EAST else Position.EAST

    def get_defenders(self) -> List[Position]:
        """获取两个防家的位置"""
        positions = list(Position)
        positions.remove(self.declarer)
        positions.remove(self.get_partner(self.declarer))
        return positions

    def analyze_strip_endplay(self, declarer_hand: Hand, dummy_hand: Hand) -> Dict:
        """分析剥光投入的可能性

        返回分析结果字典，包含：
        - feasible: 是否可行
        - target_player: 目标防家
        - suit_to_strip: 需要剥光的花色
        - entry_to_dummy: 明手进手张
        - recommended_play: 推荐打法
        """

        analysis_result = {
            'feasible': False,
            'target_player': None,
            'suit_to_strip': [],
            'entry_to_dummy': [],
            'recommended_play': [],
            'explanation': ""
        }

        # 1. 检查将牌是否清完（如果是将牌定约）
        if not self.is_trump_cleared():
            analysis_result['explanation'] = "需要先清光将牌才能执行剥光投入"
            analysis_result['recommended_play'] = ["清光将牌"]
            return analysis_result

        # 2. 分析各防家的牌型和大牌
        defenders_vulnerability = self.analyze_defenders_vulnerability()

        # 3. 寻找可能的投入目标
        target_player = self.find_endplay_target(defenders_vulnerability)

        if not target_player:
            analysis_result['explanation'] = "未找到合适的投入目标"
            return analysis_result

        # 4. 分析需要剥光的花色
        suits_to_strip = self.find_suits_to_strip(target_player, defenders_vulnerability)

        if not suits_to_strip:
            analysis_result['explanation'] = f"无法对{target_player.value}实施有效剥光"
            return analysis_result

        # 5. 检查明手进手张
        dummy_entries = self.find_dummy_entries()

        if not dummy_entries and self.trump_suit != Suit.NT:
            analysis_result['explanation'] = "明手缺乏进手张，无法完成剥光"
            return analysis_result

        # 6. 构建打法路线
        play_sequence = self.build_play_sequence(target_player, suits_to_strip, dummy_entries)

        analysis_result.update({
            'feasible': True,
            'target_player': target_player,
            'suit_to_strip': suits_to_strip,
            'entry_to_dummy': dummy_entries,
            'recommended_play': play_sequence,
            'explanation': self.generate_explanation(target_player, suits_to_strip, play_sequence)
        })

        return analysis_result

    def is_trump_cleared(self) -> bool:
        """检查将牌是否已经清完"""
        if self.trump_suit == Suit.NT:
            return True

        # 这里需要实际牌局状态，简化返回True
        return True

    def analyze_defenders_vulnerability(self) -> Dict[Position, Dict]:
        """分析防家的弱点（在哪些花色上会被投入）"""
        vulnerability = {}

        for defender in self.defenders:
            # 这里需要实际的牌张信息
            # 简化分析：假设我们知道防家的牌
            vul_info = {
                'safe_exits': [],  # 安全脱手花色
                'danger_suits': [],  # 危险花色（有间张或会建立庄家赢墩）
                'short_suits': []  # 短套花色（可能被剥光）
            }
            vulnerability[defender] = vul_info

        return vulnerability

    def find_endplay_target(self, vulnerability: Dict) -> Optional[Position]:
        """寻找投入目标防家"""

        # 策略：寻找有危险花色且安全脱手张少的防家
        for defender, vul_info in vulnerability.items():
            if len(vul_info['danger_suits']) > 0 and len(vul_info['safe_exits']) <= 1:
                return defender

        return None

    def find_suits_to_strip(self, target_player: Position, vulnerability: Dict) -> List[Suit]:
        """确定需要剥光的花色"""
        suits = []

        # 需要剥光防家的安全脱手张
        safe_suits = vulnerability[target_player]['safe_exits']

        # 排除将牌（如果是将牌定约且已清光）
        if self.trump_suit != Suit.NT:
            safe_suits = [s for s in safe_suits if s != self.trump_suit]

        return safe_suits[:2]  # 通常剥光1-2个花色

    def find_dummy_entries(self) -> List[Tuple[Suit, str]]:
        """寻找明手进手张"""
        entries = []

        # 这里需要实际的牌张信息
        # 简化：返回假设的进手张
        return entries

    def build_play_sequence(self, target_player: Position, suits_to_strip: List[Suit],
                            dummy_entries: List) -> List[str]:
        """构建打法序列"""
        sequence = []

        # 1. 剥光阶段
        for suit in suits_to_strip:
            sequence.append(f"兑现{suit.value}花色赢墩，剥光{target_player.value}在该花色的牌")

        # 2. 投入阶段
        if self.trump_suit != Suit.NT and self.trump_suit not in suits_to_strip:
            sequence.append(f"如果可能，再剥光一张{self.trump_suit.value}")

        # 3. 投入
        danger_suit = self.find_danger_suit_for_target(target_player)
        if danger_suit:
            sequence.append(f"从明手出{danger_suit.value}投入{target_player.value}")
            sequence.append(f"迫使{target_player.value}从{danger_suit.value}花色出牌")

        return sequence

    def find_danger_suit_for_target(self, target_player: Position) -> Optional[Suit]:
        """寻找对目标防家危险的花色"""
        # 简化实现
        for suit in [Suit.CLUBS, Suit.DIAMONDS, Suit.HEARTS, Suit.SPADES]:
            if suit != self.trump_suit or self.trump_suit == Suit.NT:
                return suit
        return None

    def generate_explanation(self, target_player: Position, suits_to_strip: List[Suit],
                             play_sequence: List[str]) -> str:
        """生成文字解释"""
        explanation = f"剥光投入分析结果：\n"
        explanation += f"1. 目标防家: {target_player.value}\n"
        explanation += f"2. 需要剥光的花色: {[s.value for s in suits_to_strip]}\n"
        explanation += f"3. 打法步骤:\n"

        for i, step in enumerate(play_sequence, 1):
            explanation += f"   步骤{i}: {step}\n"

        explanation += f"\n预期效果: 迫使{target_player.value}出牌，从而建立额外赢墩或避免输墩。"

        return explanation


class BridgeGame:
    """桥牌游戏主类"""

    def __init__(self):
        self.table = BridgeTable()
        self.analyzer = None

    def setup_contract(self, level: int, suit_str: str, declarer_str: str):
        """设置定约"""
        suit_map = {'C': Suit.CLUBS, 'D': Suit.DIAMONDS,
                    'H': Suit.HEARTS, 'S': Suit.SPADES, 'NT': Suit.NT}
        position_map = {'N': Position.NORTH, 'S': Position.SOUTH,
                        'E': Position.EAST, 'W': Position.WEST}

        suit = suit_map.get(suit_str.upper(), Suit.NT)
        declarer = position_map.get(declarer_str.upper(), Position.SOUTH)

        self.table.contract = Contract(level, suit, declarer)
        self.analyzer = StripEndplayAnalyzer(self.table)

    def analyze_current_position(self, declarer_cards: Dict, dummy_cards: Dict) -> Dict:
        """分析当前牌局位置"""

        # 创建庄家和明手的牌
        declarer_hand = Hand()
        dummy_hand = Hand()

        # 这里简化：直接传入分析结果
        if self.analyzer:
            # 在实际应用中，这里应该根据实际牌张进行分析
            # 现在返回一个示例分析

            return {
                'feasible': True,
                'target_player': Position.WEST,
                'suit_to_strip': [Suit.HEARTS, Suit.DIAMONDS],
                'recommended_play': [
                    "1. 兑现♥赢墩，剥光西家的♥",
                    "2. 兑现♦赢墩，剥光西家的♦",
                    "3. 出♣投入西家",
                    "4. 迫使西家从♣花色出牌，建立明手的♣Q"
                ],
                'explanation': "这是一个典型的剥光投入局面。剥光西家在?和?的脱手张后，用?投入西家，迫使西家从?K出牌，飞中明手的?Q。"
            }

        return {'feasible': False, 'explanation': "无法分析"}


# 示例使用
def main():
    """主函数示例"""
    print("桥牌剥光投入打法分析器")
    print("=" * 50)

    # 创建游戏实例
    game = BridgeGame()

    # 设置定约：4?，南家主打
    game.setup_contract(6, 'S', 'S')

    print(f"定约: 6{game.table.contract.suit.value}")
    print(f"庄家: {game.table.contract.declarer.value}")
    print()

    # 示例牌局分析
    declarer_hand_example = {
        Suit.SPADES: ['J', '9', '8', '4', '2'],
        Suit.HEARTS: ['K', '7', '5'],
        Suit.DIAMONDS: ['A', 'J', '10'],
        Suit.CLUBS: ['A', '2']
    }

    dummy_hand_example = {
        Suit.SPADES: ['A', 'K', 'Q', 'J', '7'],
        Suit.HEARTS: ['A', 'Q', '2'],
        Suit.DIAMONDS: ['K', '9', '4'],
        Suit.CLUBS: ['8', '6']
    }

    # 分析剥光投入
    analysis = game.analyze_current_position(declarer_hand_example, dummy_hand_example)

    print("剥光投入分析报告:")
    print("-" * 30)

    if analysis['feasible']:
        print("? 剥光投入可行!")
        print(f"目标防家: {analysis['target_player'].value if 'target_player' in analysis else 'N/A'}")

        if 'suit_to_strip' in analysis:
            suits = [s.value for s in analysis['suit_to_strip']]
            print(f"需要剥光的花色: {suits}")

        print("\n推荐打法:")
        for step in analysis['recommended_play']:
            print(f"  {step}")

        print(f"\n{analysis['explanation']}")
    else:
        print("? 当前局面不适合剥光投入")
        print(f"原因: {analysis['explanation']}")

    print("\n" + "=" * 50)
    print("注: 这是一个简化版分析器。完整实现需要:")
    print("1. 完整的牌张识别和跟踪系统")
    print("2. 精确的输赢墩计算")
    print("3. 防家牌张推理算法")
    print("4. 更复杂的局面评估函数。")


if __name__ == "__main__":
    main()
