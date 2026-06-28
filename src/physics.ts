import * as THREE from 'three';
import { Node, Relationship } from './types';

/**
 * 物理引擎 - 力导向图模拟
 * 
 * 核心概念：
 * - 节点有位置、速度、受力
 * - 节点之间有弹簧力（关系连接）
 * - 节点之间有斥力（避免重叠）
 * - 点击节点时，主链节点受到约束力（目标位置）
 * - 其他节点只受物理连接影响，自然响应
 */

export interface PhysicsNode {
  id: string;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  force: THREE.Vector3;
  mass: number;
  isConstrained: boolean; // 是否受约束（主链节点）
  targetPosition?: THREE.Vector3; // 约束目标位置
}

export interface PhysicsConfig {
  // 弹簧力参数
  springStrength: number; // 弹簧强度
  springDamping: number; // 弹簧阻尼
  restLength: number; // 弹簧自然长度
  
  // 斥力参数
  repulsionStrength: number; // 斥力强度
  repulsionRadius: number; // 斥力作用半径
  
  // 全局参数
  damping: number; // 全局阻尼（让系统稳定）
  maxVelocity: number; // 最大速度限制
  maxForce: number; // 最大力限制
  
  // 约束力参数
  constraintStrength: number; // 约束力强度
}

export const DEFAULT_CONFIG: PhysicsConfig = {
  springStrength: 0.5,
  springDamping: 0.1,
  restLength: 8,
  repulsionStrength: 100,
  repulsionRadius: 15,
  damping: 0.85,
  maxVelocity: 2,
  maxForce: 10,
  constraintStrength: 0.3
};

export class PhysicsEngine {
  private nodes: Map<string, PhysicsNode> = new Map();
  private relationships: Relationship[] = [];
  private config: PhysicsConfig;
  
  constructor(config: PhysicsConfig = DEFAULT_CONFIG) {
    this.config = config;
  }
  
  /**
   * 初始化节点
   */
  initializeNodes(nodes: Node[], initialPositions?: Map<string, THREE.Vector3>) {
    nodes.forEach(node => {
      const position = initialPositions?.get(node.id) || new THREE.Vector3(
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50,
        (Math.random() - 0.5) * 50
      );
      
      this.nodes.set(node.id, {
        id: node.id,
        position: position.clone(),
        velocity: new THREE.Vector3(0, 0, 0),
        force: new THREE.Vector3(0, 0, 0),
        mass: 1,
        isConstrained: false
      });
    });
  }
  
  /**
   * 设置关系
   */
  setRelationships(relationships: Relationship[]) {
    this.relationships = relationships;
  }
  
  /**
   * 设置节点约束（点击节点时调用）
   */
  setConstraint(nodeId: string, targetPosition: THREE.Vector3) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isConstrained = true;
      node.targetPosition = targetPosition.clone();
    }
  }
  
  /**
   * 清除节点约束
   */
  clearConstraint(nodeId: string) {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.isConstrained = false;
      node.targetPosition = undefined;
    }
  }
  
  /**
   * 清除所有约束
   */
  clearAllConstraints() {
    this.nodes.forEach(node => {
      node.isConstrained = false;
      node.targetPosition = undefined;
    });
  }
  
  /**
   * 获取节点位置
   */
  getNodePosition(nodeId: string): THREE.Vector3 | null {
    const node = this.nodes.get(nodeId);
    return node ? node.position.clone() : null;
  }
  
  /**
   * 获取所有节点位置
   */
  getAllPositions(): Map<string, THREE.Vector3> {
    const positions = new Map<string, THREE.Vector3>();
    this.nodes.forEach((node, id) => {
      positions.set(id, node.position.clone());
    });
    return positions;
  }
  
  /**
   * 物理模拟步进
   */
  step(deltaTime: number = 1 / 60) {
    // 1. 清空所有节点的力
    this.nodes.forEach(node => {
      node.force.set(0, 0, 0);
    });
    
    // 2. 计算斥力（节点之间的排斥）
    this.calculateRepulsion();
    
    // 3. 计算弹簧力（关系连接）
    this.calculateSpringForces();
    
    // 4. 计算约束力（目标位置）
    this.calculateConstraintForces();
    
    // 5. 更新速度和位置
    this.updatePositions(deltaTime);
  }
  
  /**
   * 计算斥力
   */
  private calculateRepulsion() {
    const nodeArray = Array.from(this.nodes.values());
    
    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = i + 1; j < nodeArray.length; j++) {
        const nodeA = nodeArray[i];
        const nodeB = nodeArray[j];
        
        const diff = new THREE.Vector3().subVectors(nodeA.position, nodeB.position);
        const distance = diff.length();
        
        if (distance < this.config.repulsionRadius && distance > 0.1) {
          // 斥力与距离平方成反比
          const forceMagnitude = this.config.repulsionStrength / (distance * distance);
          const force = diff.normalize().multiplyScalar(forceMagnitude);
          
          nodeA.force.add(force);
          nodeB.force.sub(force);
        }
      }
    }
  }
  
  /**
   * 计算弹簧力
   */
  private calculateSpringForces() {
    this.relationships.forEach(rel => {
      const nodeA = this.nodes.get(rel.sourceId);
      const nodeB = this.nodes.get(rel.targetId);
      
      if (!nodeA || !nodeB) return;
      
      const diff = new THREE.Vector3().subVectors(nodeB.position, nodeA.position);
      const distance = diff.length();
      
      if (distance > 0.1) {
        // 弹簧力：F = -k * (x - x0)
        const displacement = distance - this.config.restLength;
        const forceMagnitude = this.config.springStrength * displacement;
        
        // 弹簧阻尼：F = -c * v
        const relativeVelocity = new THREE.Vector3().subVectors(nodeB.velocity, nodeA.velocity);
        const dampingForce = relativeVelocity.dot(diff.normalize()) * this.config.springDamping;
        
        const totalForce = forceMagnitude + dampingForce;
        const force = diff.normalize().multiplyScalar(totalForce);
        
        nodeA.force.add(force);
        nodeB.force.sub(force);
      }
    });
  }
  
  /**
   * 计算约束力
   */
  private calculateConstraintForces() {
    this.nodes.forEach(node => {
      if (node.isConstrained && node.targetPosition) {
        const diff = new THREE.Vector3().subVectors(node.targetPosition, node.position);
        const force = diff.multiplyScalar(this.config.constraintStrength);
        node.force.add(force);
      }
    });
  }
  
  /**
   * 更新位置和速度
   */
  private updatePositions(deltaTime: number) {
    this.nodes.forEach(node => {
      // 限制最大力
      if (node.force.length() > this.config.maxForce) {
        node.force.normalize().multiplyScalar(this.config.maxForce);
      }
      
      // 更新速度：v = v + F/m * dt
      const acceleration = node.force.divideScalar(node.mass);
      node.velocity.add(acceleration.multiplyScalar(deltaTime));
      
      // 应用阻尼
      node.velocity.multiplyScalar(this.config.damping);
      
      // 限制最大速度
      if (node.velocity.length() > this.config.maxVelocity) {
        node.velocity.normalize().multiplyScalar(this.config.maxVelocity);
      }
      
      // 更新位置：x = x + v * dt
      node.position.add(node.velocity.clone().multiplyScalar(deltaTime));
    });
  }
  
  /**
   * 添加全局旋转（星云公转效果）
   */
  applyGlobalRotation(axis: THREE.Vector3, angle: number) {
    const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
    
    this.nodes.forEach(node => {
      if (!node.isConstrained) {
        node.position.applyQuaternion(quaternion);
        node.velocity.applyQuaternion(quaternion);
      }
    });
  }
}
