// Firebase 소셜 기능 시스템
class EduPetSocial {
    constructor() {
        this.friendsListeners = new Map();
        this.showOffListeners = new Map();
    }

    // 친구 추가 (닉네임으로 검색)
    async addFriend(friendNickname) {
        try {
            if (!eduPetAuth.currentUser || !eduPetAuth.userData) {
                throw new Error('로그인이 필요합니다');
            }

            if (friendNickname === eduPetAuth.userData.profile.nickname) {
                throw new Error('자기 자신은 친구로 추가할 수 없습니다');
            }

            // 친구 사용자 ID 찾기
            const friendUidSnapshot = await firebase_db.ref(`nicknames/${friendNickname}`).once('value');
            if (!friendUidSnapshot.exists()) {
                throw new Error('존재하지 않는 닉네임입니다');
            }

            const friendUid = friendUidSnapshot.val();
            const currentUid = eduPetAuth.currentUser.uid;

            // 이미 친구인지 확인
            const existingFriendship = await firebase_db.ref(`users/${currentUid}/social/friends/${friendUid}`).once('value');
            if (existingFriendship.exists()) {
                throw new Error('이미 친구로 등록된 사용자입니다');
            }

            // 친구 프로필 정보 가져오기
            const friendProfileSnapshot = await firebase_db.ref(`users/${friendUid}/profile`).once('value');
            const friendProfile = friendProfileSnapshot.val();

            if (!friendProfile) {
                throw new Error('친구 프로필을 찾을 수 없습니다');
            }

            // 양방향 친구 관계 생성
            const updates = {};
            const now = Date.now();

            // 현재 사용자의 친구 목록에 추가
            updates[`users/${currentUid}/social/friends/${friendUid}`] = {
                nickname: friendProfile.nickname,
                avatarAnimal: friendProfile.avatarAnimal,
                addedAt: now,
                status: 'active'
            };

            // 친구의 친구 목록에 추가
            updates[`users/${friendUid}/social/friends/${currentUid}`] = {
                nickname: eduPetAuth.userData.profile.nickname,
                avatarAnimal: eduPetAuth.userData.profile.avatarAnimal,
                addedAt: now,
                status: 'active'
            };

            await firebase_db.ref().update(updates);

            // 친구 추가 알림 (선택사항)
            await this.sendFriendNotification(friendUid, 'friend_added', {
                senderNickname: eduPetAuth.userData.profile.nickname
            });

            return true;
        } catch (error) {
            console.error('친구 추가 실패:', error);
            throw error;
        }
    }

    // 친구 목록 가져오기
    async getFriendsList() {
        try {
            if (!eduPetAuth.currentUser) return [];

            const friendsSnapshot = await firebase_db.ref(`users/${eduPetAuth.currentUser.uid}/social/friends`).once('value');
            const friendsData = friendsSnapshot.val();

            if (!friendsData) return [];

            // 친구들의 최신 상태 정보 가져오기
            const friendsList = await Promise.all(
                Object.entries(friendsData).map(async ([friendUid, friendInfo]) => {
                    try {
                        const profileSnapshot = await firebase_db.ref(`users/${friendUid}/profile`).once('value');
                        const statsSnapshot = await firebase_db.ref(`users/${friendUid}/stats`).once('value');
                        
                        const profile = profileSnapshot.val();
                        const stats = statsSnapshot.val();

                        return {
                            uid: friendUid,
                            nickname: profile?.nickname || friendInfo.nickname,
                            avatarAnimal: profile?.avatarAnimal || friendInfo.avatarAnimal,
                            isOnline: profile?.isOnline || false,
                            lastActive: profile?.lastActive,
                            addedAt: friendInfo.addedAt,
                            stats: stats || {}
                        };
                    } catch (error) {
                        console.error(`친구 ${friendUid} 정보 로드 실패:`, error);
                        return null;
                    }
                })
            );

            return friendsList.filter(friend => friend !== null);
        } catch (error) {
            console.error('친구 목록 가져오기 실패:', error);
            return [];
        }
    }

    // 친구 삭제
    async removeFriend(friendUid) {
        try {
            if (!eduPetAuth.currentUser) throw new Error('로그인이 필요합니다');

            const currentUid = eduPetAuth.currentUser.uid;
            
            const updates = {};
            updates[`users/${currentUid}/social/friends/${friendUid}`] = null;
            updates[`users/${friendUid}/social/friends/${currentUid}`] = null;

            await firebase_db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('친구 삭제 실패:', error);
            return false;
        }
    }

    // 동물 자랑하기 게시
    async showOffAnimal(animalData, message = '') {
        try {
            if (!eduPetAuth.currentUser || !eduPetAuth.userData) {
                throw new Error('로그인이 필요합니다');
            }

            const showOffId = firebase_db.ref('show_offs').push().key;
            const now = Date.now();

            const showOffData = {
                id: showOffId,
                userId: eduPetAuth.currentUser.uid,
                userNickname: eduPetAuth.userData.profile.nickname || '익명',
                userAvatar: eduPetAuth.userData.profile.avatarAnimal || 'bunny',
                animal: {
                    name: animalData.name,
                    tier: animalData.tier,
                    image: animalData.image,
                    stats: animalData.stats
                },
                message: message.slice(0, 200), // 최대 200자
                createdAt: now,
                likes: 0,
                comments: {},
                likedBy: {}
            };

            await firebase_db.ref(`show_offs/${showOffId}`).set(showOffData);

            // 사용자 통계 업데이트
            await eduPetAuth.updateUserStats({ showOffsPosted: 1 });

            return showOffId;
        } catch (error) {
            console.error('동물 자랑하기 실패:', error);
            throw error;
        }
    }

    // 자랑하기 목록 가져오기
    async getShowOffs(limit = 20, lastKey = null) {
        try {
            let query = firebase_db.ref('show_offs')
                .orderByChild('createdAt')
                .limitToLast(limit);

            if (lastKey) {
                query = query.endBefore(lastKey);
            }

            const snapshot = await query.once('value');
            const data = snapshot.val();

            if (!data) return [];

            // 최신순으로 정렬
            const showOffs = Object.values(data).sort((a, b) => b.createdAt - a.createdAt);

            return showOffs;
        } catch (error) {
            console.error('자랑하기 목록 가져오기 실패:', error);
            return [];
        }
    }

    // 자랑하기 좋아요
    async likeShowOff(showOffId) {
        try {
            if (!eduPetAuth.currentUser) throw new Error('로그인이 필요합니다');

            const userId = eduPetAuth.currentUser.uid;
            
            // 이미 좋아요했는지 확인
            const likeSnapshot = await firebase_db.ref(`show_offs/${showOffId}/likedBy/${userId}`).once('value');
            
            if (likeSnapshot.exists()) {
                // 좋아요 취소
                const updates = {};
                updates[`show_offs/${showOffId}/likedBy/${userId}`] = null;
                updates[`show_offs/${showOffId}/likes`] = firebase.database.ServerValue.increment(-1);
                
                await firebase_db.ref().update(updates);
                return 'unliked';
            } else {
                // 좋아요 추가
                const updates = {};
                updates[`show_offs/${showOffId}/likedBy/${userId}`] = {
                    nickname: eduPetAuth.userData.profile.nickname || '익명',
                    timestamp: Date.now()
                };
                updates[`show_offs/${showOffId}/likes`] = firebase.database.ServerValue.increment(1);
                
                await firebase_db.ref().update(updates);
                return 'liked';
            }
        } catch (error) {
            console.error('좋아요 실패:', error);
            return false;
        }
    }

    // 자랑하기 댓글 추가
    async addComment(showOffId, comment) {
        try {
            if (!eduPetAuth.currentUser || !eduPetAuth.userData) {
                throw new Error('로그인이 필요합니다');
            }

            const commentId = firebase_db.ref(`show_offs/${showOffId}/comments`).push().key;
            
            const commentData = {
                id: commentId,
                userId: eduPetAuth.currentUser.uid,
                nickname: eduPetAuth.userData.profile.nickname || '익명',
                avatarAnimal: eduPetAuth.userData.profile.avatarAnimal || 'bunny',
                message: comment.slice(0, 100), // 최대 100자
                createdAt: Date.now()
            };

            await firebase_db.ref(`show_offs/${showOffId}/comments/${commentId}`).set(commentData);

            return commentId;
        } catch (error) {
            console.error('댓글 추가 실패:', error);
            throw error;
        }
    }

    // 그룹 생성 (간단한 학습 그룹)
    async createGroup(groupName, description = '') {
        try {
            if (!eduPetAuth.currentUser || !eduPetAuth.userData) {
                throw new Error('로그인이 필요합니다');
            }

            const groupId = firebase_db.ref('groups').push().key;
            const now = Date.now();

            const groupData = {
                id: groupId,
                name: groupName,
                description: description,
                createdBy: eduPetAuth.currentUser.uid,
                createdAt: now,
                memberCount: 1,
                members: {
                    [eduPetAuth.currentUser.uid]: {
                        nickname: eduPetAuth.userData.profile.nickname || '익명',
                        avatarAnimal: eduPetAuth.userData.profile.avatarAnimal || 'bunny',
                        joinedAt: now,
                        role: 'owner'
                    }
                },
                settings: {
                    isPublic: true,
                    maxMembers: 50
                },
                stats: {
                    totalQuestions: 0,
                    totalCorrectAnswers: 0
                }
            };

            await firebase_db.ref(`groups/${groupId}`).set(groupData);

            // 사용자의 그룹 목록에 추가
            await firebase_db.ref(`users/${eduPetAuth.currentUser.uid}/social/groups/${groupId}`).set({
                name: groupName,
                role: 'owner',
                joinedAt: now
            });

            return groupId;
        } catch (error) {
            console.error('그룹 생성 실패:', error);
            throw error;
        }
    }

    // 그룹 참가
    async joinGroup(groupId) {
        try {
            if (!eduPetAuth.currentUser || !eduPetAuth.userData) {
                throw new Error('로그인이 필요합니다');
            }

            const userId = eduPetAuth.currentUser.uid;
            
            // 그룹 존재 여부 확인
            const groupSnapshot = await firebase_db.ref(`groups/${groupId}`).once('value');
            if (!groupSnapshot.exists()) {
                throw new Error('존재하지 않는 그룹입니다');
            }

            const groupData = groupSnapshot.val();
            
            // 이미 멤버인지 확인
            if (groupData.members && groupData.members[userId]) {
                throw new Error('이미 참가한 그룹입니다');
            }

            // 최대 멤버 수 확인
            if (groupData.memberCount >= (groupData.settings?.maxMembers || 50)) {
                throw new Error('그룹 정원이 가득 찼습니다');
            }

            const now = Date.now();
            const updates = {};

            // 그룹 멤버에 추가
            updates[`groups/${groupId}/members/${userId}`] = {
                nickname: eduPetAuth.userData.profile.nickname || '익명',
                avatarAnimal: eduPetAuth.userData.profile.avatarAnimal || 'bunny',
                joinedAt: now,
                role: 'member'
            };

            // 멤버 수 증가
            updates[`groups/${groupId}/memberCount`] = firebase.database.ServerValue.increment(1);

            // 사용자의 그룹 목록에 추가
            updates[`users/${userId}/social/groups/${groupId}`] = {
                name: groupData.name,
                role: 'member',
                joinedAt: now
            };

            await firebase_db.ref().update(updates);
            return true;
        } catch (error) {
            console.error('그룹 참가 실패:', error);
            throw error;
        }
    }

    // 알림 발송
    async sendFriendNotification(receiverId, type, data) {
        try {
            const notificationId = firebase_db.ref(`notifications/${receiverId}`).push().key;
            
            const notification = {
                id: notificationId,
                type: type,
                data: data,
                read: false,
                createdAt: Date.now()
            };

            await firebase_db.ref(`notifications/${receiverId}/${notificationId}`).set(notification);
        } catch (error) {
            console.error('알림 발송 실패:', error);
        }
    }

    // 실시간 친구 목록 구독
    subscribeFriendsList(callback) {
        if (!eduPetAuth.currentUser) return;

        const friendsRef = firebase_db.ref(`users/${eduPetAuth.currentUser.uid}/social/friends`);
        
        const listener = friendsRef.on('value', async (snapshot) => {
            try {
                const friendsData = snapshot.val();
                if (!friendsData) {
                    callback([]);
                    return;
                }

                const friendsList = await this.getFriendsList();
                callback(friendsList);
            } catch (error) {
                console.error('친구 목록 리스너 에러:', error);
                callback([]);
            }
        });

        this.friendsListeners.set('friends', { ref: friendsRef, listener });
        return listener;
    }

    // 구독 해제
    unsubscribeFriendsList() {
        const listenerInfo = this.friendsListeners.get('friends');
        if (listenerInfo) {
            listenerInfo.ref.off('value', listenerInfo.listener);
            this.friendsListeners.delete('friends');
        }
    }
}

// 전역 인스턴스
const eduPetSocial = new EduPetSocial();