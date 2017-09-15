import React from 'react';
import { connect } from "react-redux";
import { Link } from 'react-router-dom';
import find from 'lodash/find';
import FontAwesome from 'react-fontawesome';
import ReactTooltip from 'react-tooltip'

class RoomList extends React.Component {

    isRoomActive(jid) {
        if(this.props.rooms[jid] && this.props.rooms[jid].isCurrent) {
            return true;
        }
        return false;
    }

    // TODO replace this with state flag?
    isRoomBookmarked(jid) {
        return find(this.props.bookmarks.conferences, function(bookmark) {
            return bookmark.jid.bare === jid
        });
    }

    isRoomUnread(jid) {
        if(this.props.rooms[jid]) {
            return (this.props.rooms[jid].unreadMessageCount > 0);
        }
        return false;
    }

    getRoomUnread(jid) {
        if(this.props.rooms[jid]) {
            return this.props.rooms[jid].unreadMessageCount
        }
    }

    render() {
        
        return (
        <div className="RoomList">
            <h3>Bookmarked Rooms</h3>
            
            { this.props.bookmarks.conferences ? (
                <ul>
                    { this.props.bookmarks.conferences
                        .sort((a, b) => a.jid.bare > b.jid.bare)
                        .map(room => (
                        <li key={"bookmark-" + room.jid.bare}>
                            <Link to={`/room/` + room.jid.bare} className={(this.isRoomActive(room.jid.bare)) ? "active" : ""}>
                                <span>#</span><span className="local">{room.jid.local}</span>
                                { this.isRoomUnread(room.jid.bare) && (
                                    <span className="unread badge">{this.getRoomUnread(room.jid.bare)}</span>
                                )}
                                {/* <span className="domain">@{room.jid.domain}</span> */}
                            </Link>
                        </li>
                    ))}
                </ul>

            ) : (
                <div>Loading...</div>
            )}

            <h3>Rooms</h3>

            <Link to='/' className="joinRoom iconButton"
                data-offset="{'left': 2}"
                data-delay-show='100'
                data-tip="Join a room">
                <FontAwesome name='plus-circle' />
            </Link>

            {/* TODO DRY... */}

            { this.props.rooms ? (
                <ul>
                    { Object.keys(this.props.rooms)
                        .filter(roomJid => {
                            return !this.isRoomBookmarked(roomJid)
                        })
                        .sort((a, b) => a > b)
                        .map(roomJid => (
                        <li key={roomJid}><Link to={`/room/` + roomJid} className={(this.isRoomActive(roomJid)) ? "active" : ""}>
                            <span>#</span><span className="local">{roomJid.substr(0, roomJid.indexOf('@'))}</span>
                            { this.isRoomUnread(roomJid) && (
                                    <span className="unread badge">{this.getRoomUnread(roomJid)}</span>
                                )}
                            </Link>
                        </li>                        
                    ))}
                </ul>

            ) : (
                <div>Loading...</div>
            )}

        </div>
        );
    }

}

const mapStateToProps = (state, props) => ({
  bookmarks: state.bookmarks,
  rooms: state.rooms,
  recentRooms: state.local.recent
});

const mapDispatchToProps = (dispatch, props) => {
  return {};
};

export default connect(mapStateToProps, mapDispatchToProps)(RoomList);
